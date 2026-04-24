import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, ChefHat, Utensils, PackageCheck, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { formatFCFA } from "@/lib/currency";

interface OrderRow {
  id: string;
  restaurant_id: string;
  status: string;
  total: number;
  table_number: string | null;
  customer_name: string | null;
  items: Array<{ name: string; quantity: number; unit_price: number }>;
  created_at: string;
  updated_at: string;
}

// Logical pipeline (in order). "rejected" handled separately.
const STEPS: Array<{ key: string; label: string; description: string; icon: typeof Clock }> = [
  { key: "new",        label: "Reçue",        description: "Le restaurant a bien reçu votre commande", icon: Clock },
  { key: "accepted",   label: "Envoyée en cuisine", description: "La brigade a été prévenue", icon: ChefHat },
  { key: "preparing",  label: "En préparation", description: "Vos plats sont en cours de préparation", icon: Utensils },
  { key: "ready",      label: "Prête",        description: "Votre commande est prête", icon: PackageCheck },
  { key: "delivered",  label: "Servie",       description: "Bon appétit !", icon: CheckCircle2 },
];

const stepIndex = (status: string) => {
  const i = STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
};

const PublicOrderTracking = () => {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [restoName, setRestoName] = useState<string>("");
  const [themeColor, setThemeColor] = useState<string>("#16a34a");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let active = true;

    const fetchOrder = async () => {
      // Anonymous reads go through a SECURITY DEFINER RPC that requires
      // the exact order UUID (no enumeration possible).
      const { data: rows } = await supabase.rpc("get_public_order_status", { _order_id: orderId });
      const data = Array.isArray(rows) ? rows[0] : rows;
      if (!active) return;
      if (!data) { setNotFound(true); setLoading(false); return; }
      setOrder(data as unknown as OrderRow);
      setLoading(false);

      // Fetch restaurant display info via public RPC
      if (slug) {
        const { data: rpc } = await supabase.rpc("get_public_restaurant", { _slug: slug });
        const r = rpc as { name?: string; theme_color?: string } | null;
        if (r?.name) setRestoName(r.name);
        if (r?.theme_color) setThemeColor(r.theme_color);
      }
    };
    fetchOrder();

    // Realtime subscription: only this order id
    const channel = supabase
      .channel(`public-order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "public_orders", filter: `id=eq.${orderId}` },
        (payload) => {
          if (!active) return;
          setOrder((prev) => prev ? { ...prev, ...(payload.new as Partial<OrderRow>) } as OrderRow : prev);
        },
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [orderId, slug]);

  const currentStep = order ? stepIndex(order.status) : 0;
  const isRejected = order?.status === "rejected";

  const elapsed = useMemo(() => {
    if (!order) return "";
    const ms = Date.now() - new Date(order.created_at).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    return `il y a ${Math.floor(min / 60)} h ${min % 60} min`;
  }, [order]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold">Commande introuvable</h1>
        <p className="text-sm text-muted-foreground">Le lien est peut-être incorrect ou la commande a été supprimée.</p>
        {slug && <Button asChild variant="outline"><Link to={`/r/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" /> Retour au menu</Link></Button>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          {slug ? (
            <Button asChild variant="ghost" size="sm">
              <Link to={`/r/${slug}`}><ArrowLeft className="mr-2 h-4 w-4" /> Menu</Link>
            </Button>
          ) : <span />}
          <Badge variant="outline" className="text-xs">{elapsed}</Badge>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Suivi de commande</h1>
          {restoName && <p className="text-sm text-muted-foreground">{restoName}</p>}
          {order.table_number && <Badge variant="secondary" className="mt-2">Table {order.table_number}</Badge>}
        </div>

        {isRejected ? (
          <Card className="border-destructive p-6 text-center">
            <XCircle className="mx-auto mb-2 h-12 w-12 text-destructive" />
            <h2 className="text-lg font-bold">Commande refusée</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Le restaurant n'a pas pu accepter votre commande. Contactez-le directement pour plus d'informations.
            </p>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="space-y-1">
              {STEPS.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex gap-3">
                    {/* Rail */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          done || active ? "text-white" : "bg-muted text-muted-foreground"
                        }`}
                        style={done || active ? { background: themeColor, borderColor: themeColor } : undefined}
                      >
                        {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className={`h-5 w-5 ${active ? "animate-pulse" : ""}`} />}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`my-1 w-0.5 flex-1 ${done ? "" : "bg-border"}`}
                          style={done ? { background: themeColor, minHeight: "1.5rem" } : { minHeight: "1.5rem" }}
                        />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <p className={`font-semibold ${active ? "" : done ? "" : "text-muted-foreground"}`}>{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                      {active && (
                        <Badge className="mt-2 text-xs" style={{ background: themeColor }}>
                          En cours
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Order details */}
        <Card className="mt-6 p-4">
          <h3 className="mb-3 font-semibold">Détail de votre commande</h3>
          <div className="space-y-2">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span><span className="font-medium">{it.quantity}×</span> {it.name}</span>
                <span className="text-muted-foreground">{formatFCFA(it.unit_price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t pt-3 font-bold">
            <span>Total</span>
            <span>{formatFCFA(order.total)}</span>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Cette page se met à jour automatiquement. Gardez ce lien pour suivre votre commande en temps réel.
        </p>
      </div>
    </div>
  );
};

export default PublicOrderTracking;