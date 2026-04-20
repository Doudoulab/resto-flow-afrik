import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Loader2, XCircle, Smartphone, ExternalLink } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { toast } from "sonner";

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

export const MobileMoneyDialog = ({ open, onOpenChange, restaurantId, orderId, amount, defaultPhone, defaultName, onPaid }: Props) => {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [name, setName] = useState(defaultName ?? "");
  const [initing, setIniting] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [provider, setProvider] = useState<string>("");

  const isWaveLink = checkoutUrl?.startsWith("https://pay.wave.com/") ?? false;
  const isPhoneLink = checkoutUrl?.startsWith("tel:") ?? false;
  const showGenericQr = Boolean(checkoutUrl) && !isWaveLink && !isPhoneLink;

  useEffect(() => {
    if (!open) {
      setPaymentId(null); setCheckoutUrl(null); setStatus("pending");
      setPhone(defaultPhone ?? ""); setName(defaultName ?? "");
    }
  }, [open, defaultPhone, defaultName]);

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

  const init = async () => {
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
                      {showGenericQr
                        ? "Le client scanne ce QR avec son app"
                        : isWaveLink
                          ? "Ouvrez le lien Wave directement sur le téléphone du client"
                          : "Composez le code sur le téléphone du client"}
                    </p>
                    {showGenericQr && <QRCodeSVG value={checkoutUrl} size={200} includeMargin />}
                    <Badge variant="outline" className="capitalize">{provider}</Badge>
                    {isWaveLink && (
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
                        <ExternalLink className="mr-2 h-4 w-4" /> {isPhoneLink ? "Composer le code" : isWaveLink ? "Ouvrir Wave" : "Ouvrir le lien"}
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
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={init} disabled={initing}>
                {initing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Générer le QR
              </Button>
            </>
          ) : (
            <>
              {status === "pending" && (
                <Button variant="outline" onClick={checkNow}>Vérifier maintenant</Button>
              )}
              <Button onClick={() => onOpenChange(false)}>Fermer</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};