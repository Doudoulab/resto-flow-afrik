import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Loader2, XCircle, Smartphone, ExternalLink, ArrowLeft } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { toast } from "sonner";
import { buildPaymentLink, getCountry, type OperatorCode } from "@/lib/payments/operators";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  restaurantId: string;
  orderId?: string | null;
  amount: number;
  defaultPhone?: string;
  defaultName?: string;
  onPaid?: () => void;
}

type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

interface OperatorRow {
  operator_code: string;
  account_number: string | null;
  merchant_id: string | null;
}

export const MobileMoneyDialog = ({ open, onOpenChange, restaurantId, orderId, amount, defaultPhone, defaultName, onPaid }: Props) => {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [name, setName] = useState(defaultName ?? "");
  const [initing, setIniting] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [provider, setProvider] = useState<string>("");
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [countryCode, setCountryCode] = useState<string>("sn");
  const [hasAggregator, setHasAggregator] = useState<boolean>(false);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);
  const [linkKind, setLinkKind] = useState<"deeplink" | "ussd">("deeplink");

  const isWaveMerchantQr = /^https:\/\/pay\.wave\.com\/m\//.test(checkoutUrl ?? "");
  const isWaveDirectLink = (checkoutUrl?.startsWith("https://pay.wave.com/") ?? false) && !isWaveMerchantQr;
  const isPhoneLink = checkoutUrl?.startsWith("tel:") ?? false;
  const showGenericQr = Boolean(checkoutUrl) && !isWaveDirectLink && !isPhoneLink;

  useEffect(() => {
    if (!open) {
      setPaymentId(null); setCheckoutUrl(null); setStatus("pending");
      setPhone(defaultPhone ?? ""); setName(defaultName ?? "");
      setSelectedOp(null);
      return;
    }
    // Load restaurant country + operators + aggregator status
    (async () => {
      const [{ data: r }, { data: ops }, { data: cfg }] = await Promise.all([
        supabase.from("restaurants").select("country_code").eq("id", restaurantId).maybeSingle(),
        supabase.from("mobile_money_operators").select("operator_code,account_number,merchant_id,enabled,sort_order")
          .eq("restaurant_id", restaurantId).eq("enabled", true).order("sort_order"),
        supabase.from("payment_configs").select("provider,enabled").eq("restaurant_id", restaurantId).maybeSingle(),
      ]);
      if (r?.country_code) setCountryCode(r.country_code);
      setOperators((ops ?? []) as OperatorRow[]);
      setHasAggregator(Boolean(cfg?.enabled && cfg.provider !== "direct_link"));
    })();
  }, [open, defaultPhone, defaultName, restaurantId]);

  // Realtime polling on payment status
  useEffect(() => {
    if (!paymentId) return;
    const ch = supabase
      .channel(`payment-${paymentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${paymentId}` },
        (payload) => {
          const newStatus = (payload.new as { status: PaymentStatus }).status;
          setStatus(newStatus);
          if (newStatus === "success") {
            toast.success("Paiement reçu !");
            onPaid?.();
          } else if (newStatus === "failed") {
            toast.error("Paiement échoué ou annulé");
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [paymentId, onPaid]);

  const initAggregator = async () => {
    setIniting(true);
    const { data, error } = await supabase.functions.invoke("mobile-money-init", {
      body: {
        restaurant_id: restaurantId,
        order_id: orderId ?? null,
        amount,
        customer_name: name.trim() || undefined,
        customer_phone: phone.trim() || undefined,
        return_url: window.location.href,
      },
    });
    setIniting(false);
    if (error || !data?.checkout_url) {
      const msg = (data as { error?: string })?.error ?? error?.message ?? "Erreur";
      if (msg === "payment_not_configured") {
        toast.error("Mobile Money pas encore configuré dans les Paramètres.");
      } else {
        toast.error(`Erreur : ${msg}`);
      }
      return;
    }
    setPaymentId(data.payment_id);
    setCheckoutUrl(data.checkout_url);
    setProvider(data.provider);
    setLinkKind(data.checkout_url.startsWith("tel:") ? "ussd" : "deeplink");
  };

  const initOperator = async (opCode: string) => {
    const op = operators.find((o) => o.operator_code === opCode);
    if (!op) return;
    const link = buildPaymentLink({
      countryCode,
      operatorCode: opCode,
      merchantId: op.merchant_id,
      accountNumber: op.account_number,
      amount,
    });
    if (!link || (link.needsManual && !link.url)) {
      toast.error("Cet opérateur n'est pas configuré (numéro/merchant manquant).");
      return;
    }
    setSelectedOp(opCode);
    setIniting(true);
    // Trace dans payments pour le suivi
    const { data: payment } = await supabase
      .from("payments")
      .insert({
        restaurant_id: restaurantId,
        order_id: orderId ?? null,
        provider: "direct_link",
        amount,
        currency: "XOF",
        status: "pending",
        customer_name: name.trim() || null,
        customer_phone: phone.trim() || null,
        checkout_url: link.url,
        external_ref: `op-${opCode}-${Date.now().toString(36)}`,
      })
      .select()
      .single();
    setIniting(false);
    if (payment) setPaymentId(payment.id);
    setCheckoutUrl(link.url);
    setProvider(opCode);
    setLinkKind(link.kind);
  };

  const markPaid = async () => {
    if (!paymentId) return;
    await supabase.from("payments").update({ status: "success" }).eq("id", paymentId);
    if (orderId) {
      await supabase.from("orders").update({ status: "paid", payment_method: `mobile_money:${provider}` }).eq("id", orderId);
    }
    setStatus("success");
    toast.success("Paiement marqué comme reçu");
    onPaid?.();
  };

  const checkNow = async () => {
    if (!paymentId) return;
    const { data } = await supabase.from("payments").select("status").eq("id", paymentId).maybeSingle();
    if (data?.status) {
      setStatus(data.status as PaymentStatus);
      if (data.status === "success") { toast.success("Paiement confirmé"); onPaid?.(); }
      else toast.info(`Statut : ${data.status}`);
    }
  };

  const country = getCountry(countryCode);
  const opDefByCode = (code: string) => country.operators.find((o) => o.code === code);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Encaisser via Mobile Money
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <p className="text-sm text-muted-foreground">Montant à encaisser</p>
            <p className="text-3xl font-bold text-primary">{formatFCFA(amount)}</p>
          </div>

          {!checkoutUrl ? (
            <>
              {operators.length > 0 && (
                <div className="space-y-2">
                  <Label>Choisir un opérateur ({country.flag} {country.name})</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {operators.map((op) => {
                      const def = opDefByCode(op.operator_code);
                      if (!def) return null;
                      return (
                        <button
                          key={op.operator_code}
                          type="button"
                          disabled={initing}
                          onClick={() => initOperator(op.operator_code)}
                          className="flex items-center gap-2 rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:bg-accent disabled:opacity-50"
                        >
                          <div className={`h-9 w-9 rounded-md ${def.color} flex items-center justify-center text-white shrink-0`}>
                            <Smartphone className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{def.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {def.action === "deeplink" ? "Lien / QR" : "USSD"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {hasAggregator && (
                    <div className="pt-2">
                      <Button variant="outline" className="w-full" onClick={initAggregator} disabled={initing}>
                        {initing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Utiliser l'agrégateur (multi-opérateurs)
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {operators.length === 0 && !hasAggregator && (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Aucun opérateur activé. Ajoutez-en dans <strong>Paramètres → Opérateurs Mobile Money</strong>.
                </div>
              )}
              <div className="space-y-2">
                <Label>Nom client (optionnel)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Téléphone client (optionnel)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 ..." maxLength={20} />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
                {status === "pending" && (
                  <>
                    <p className="text-center text-sm font-medium">
                      {isWaveMerchantQr
                        ? "Le client scanne ce QR avec l'app Wave"
                        : showGenericQr
                          ? "Le client scanne ce QR avec son app"
                          : isWaveDirectLink
                          ? "Ouvrez le lien Wave directement sur le téléphone du client"
                          : "Composez le code sur le téléphone du client"}
                    </p>
                    {showGenericQr && <QRCodeSVG value={checkoutUrl} size={200} includeMargin />}
                    <Badge variant="outline" className="capitalize">{opDefByCode(provider)?.name ?? provider}</Badge>
                    {isWaveDirectLink && (
                      <div className="w-full rounded-md border border-border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
                        Wave ne lit pas ce type de lien comme un QR natif. Utilisez le bouton ci-dessous sur le mobile du client.
                      </div>
                    )}
                    {isPhoneLink && (
                      <div className="w-full rounded-md border border-border bg-muted/40 p-3 text-center text-sm font-medium break-all">
                        {decodeURIComponent(checkoutUrl.replace("tel:", ""))}
                      </div>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" /> {isPhoneLink ? "Composer le code" : (isWaveDirectLink || isWaveMerchantQr) ? "Ouvrir Wave" : "Ouvrir le lien"}
                      </a>
                    </Button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> En attente du paiement...
                    </div>
                  </>
                )}
                {status === "success" && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <CheckCircle2 className="h-16 w-16 text-primary" />
                    <p className="text-lg font-bold">Paiement reçu</p>
                  </div>
                )}
                {(status === "failed" || status === "cancelled") && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <XCircle className="h-16 w-16 text-destructive" />
                    <p className="text-lg font-bold">Paiement échoué</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {!checkoutUrl ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          ) : (
            <>
              {status === "pending" && (
                <>
                  <Button variant="ghost" onClick={() => { setCheckoutUrl(null); setPaymentId(null); }}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Changer
                  </Button>
                  {linkKind === "ussd" || provider === "wave" ? (
                    <Button onClick={markPaid}>Marquer comme payé</Button>
                  ) : (
                    <Button variant="outline" onClick={checkNow}>Vérifier</Button>
                  )}
                </>
              )}
              <Button onClick={() => onOpenChange(false)}>Fermer</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};