import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatFCFA } from "@/lib/currency";

interface ForecastDay { date: string; weekday: string; revenue: number; orders: number; }
interface Resp { forecast: ForecastDay[]; totalRevenue: number; totalOrders: number; dataPoints: number; confidence: string; }

const Forecast = () => {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("sales-forecast");
      if (error) throw error;
      if (r?.error) throw new Error(r.error);
      setData(r);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur de prédiction");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const confidenceColor = data?.confidence === "haute" ? "default" : data?.confidence === "moyenne" ? "secondary" : "outline";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <TrendingUp className="h-7 w-7 text-primary" /> Prévisions de ventes
          </h1>
          <p className="mt-1 text-muted-foreground">
            CA et commandes attendus pour les 7 prochains jours, basés sur l'historique.
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recalculer
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">CA prévu (7 jours)</p>
                <p className="text-2xl font-bold">{formatFCFA(data.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Commandes prévues</p>
                <p className="text-2xl font-bold">{data.totalOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Fiabilité</p>
                <div className="flex items-center gap-2">
                  <Badge variant={confidenceColor as any} className="text-sm capitalize">{data.confidence}</Badge>
                  <span className="text-xs text-muted-foreground">{data.dataPoints} jours d'historique</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Calendar className="h-5 w-5" /> Détail par jour</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ revenue: { label: "CA (FCFA)", color: "hsl(var(--primary))" } }} className="h-64 w-full">
                <BarChart data={data.forecast.map((d) => ({ ...d, label: d.weekday.slice(0, 3) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ChartContainer>

              <div className="mt-4 space-y-2">
                {data.forecast.map((d) => (
                  <div key={d.date} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium capitalize">{d.weekday}</p>
                      <p className="text-xs text-muted-foreground">{d.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatFCFA(d.revenue)}</p>
                      <p className="text-xs text-muted-foreground">~{d.orders} commandes</p>
                    </div>
                  </div>
                ))}
              </div>

              {data.confidence === "faible" && (
                <p className="mt-4 text-xs text-muted-foreground">
                  ⚠ Précision faible : il faut au moins 2 semaines d'historique de commandes payées pour des prédictions fiables.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Forecast;
