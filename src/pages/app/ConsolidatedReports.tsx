import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, TrendingUp, ShoppingBag, Receipt } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from "date-fns";

type Period = "day" | "week" | "month";

interface SiteRow {
  restaurant_id: string;
  restaurant_name: string;
  revenue: number;
  orders: number;
  subtotal: number;
  tax: number;
  discount: number;
}
interface TopItem { name: string; qty: number; revenue: number; }
interface KpiPayload {
  sites: SiteRow[];
  totals: { revenue: number; orders: number; items: number; tax?: number; discount?: number };
  top_items: TopItem[];
  error?: string;
}

const ConsolidatedReports = () => {
  const [period, setPeriod] = useState<Period>("month");

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (period === "day") return { from: startOfDay(now), to: endOfDay(now) };
    if (period === "week") return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, [period]);

  const { data, isLoading } = useQuery({
    queryKey: ["consolidated-kpis", period, from.toISOString(), to.toISOString()],
    queryFn: async (): Promise<KpiPayload> => {
      const { data, error } = await supabase.rpc("consolidated_kpis", {
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return data as unknown as KpiPayload;
    },
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const sites = data?.sites ?? [];
  const totals = data?.totals ?? { revenue: 0, orders: 0, items: 0 };
  const top = data?.top_items ?? [];
  const avgTicket = totals.orders > 0 ? Number(totals.revenue) / totals.orders : 0;
  const maxRev = Math.max(1, ...sites.map(s => Number(s.revenue)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rapports consolidés</h1>
        <p className="mt-1 text-muted-foreground">Vue agrégée sur tous vos établissements.</p>
      </div>

      <div className="flex gap-2">
        {(["day", "week", "month"] as Period[]).map(p => (
          <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
            {p === "day" ? "Aujourd'hui" : p === "week" ? "Semaine" : "Mois"}
          </Button>
        ))}
      </div>

      {sites.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Aucun établissement détecté. Créez-en depuis la page Établissements.</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />Établissements</p>
              <p className="text-2xl font-bold">{sites.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />CA total</p>
              <p className="text-2xl font-bold">{formatFCFA(Number(totals.revenue))}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingBag className="h-3 w-3" />Commandes</p>
              <p className="text-2xl font-bold">{totals.orders}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="h-3 w-3" />Ticket moyen</p>
              <p className="text-2xl font-bold">{formatFCFA(avgTicket)}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Performance par site</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Établissement</TableHead>
                  <TableHead className="text-right">Commandes</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead>Part du CA</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sites.map(s => {
                    const pct = (Number(s.revenue) / maxRev) * 100;
                    const share = Number(totals.revenue) > 0 ? (Number(s.revenue) / Number(totals.revenue)) * 100 : 0;
                    return (
                      <TableRow key={s.restaurant_id}>
                        <TableCell className="font-medium">{s.restaurant_name}</TableCell>
                        <TableCell className="text-right">{s.orders}</TableCell>
                        <TableCell className="text-right font-semibold">{formatFCFA(Number(s.revenue))}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatFCFA(Number(s.tax))}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs w-10 text-right">{share.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top 10 plats (tous sites)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Plat</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {top.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucune vente sur la période.</TableCell></TableRow>
                  )}
                  {top.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-right">{t.qty}</TableCell>
                      <TableCell className="text-right">{formatFCFA(Number(t.revenue))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ConsolidatedReports;