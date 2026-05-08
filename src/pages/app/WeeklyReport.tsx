import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatFCFA } from "@/lib/currency";

interface Report {
  id: string;
  week_start: string;
  week_end: string;
  summary: string;
  metrics: any;
  created_at: string;
}

const WeeklyReport = () => {
  const { restaurant } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("week_start", { ascending: false })
      .limit(20);
    setReports((data ?? []) as Report[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [restaurant?.id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-report");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Rapport généré");
      void load();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="h-7 w-7 text-primary" /> Rapport hebdomadaire IA
          </h1>
          <p className="mt-1 text-muted-foreground">
            Synthèse intelligente de la semaine écoulée + recommandations.
          </p>
        </div>
        <Button onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Générer le rapport de la semaine dernière
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">
              Aucun rapport encore. Cliquez sur « Générer » pour créer le rapport de la semaine dernière.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const m = r.metrics ?? {};
            const evol = m.evolutionPct;
            return (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      Semaine du {format(new Date(r.week_start), "d MMM", { locale: fr })} au {format(new Date(r.week_end), "d MMM yyyy", { locale: fr })}
                    </CardTitle>
                    {evol !== null && evol !== undefined && (
                      <Badge variant={evol >= 0 ? "default" : "destructive"} className="gap-1">
                        {evol >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {evol >= 0 ? "+" : ""}{evol}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">CA</p>
                      <p className="text-lg font-bold">{formatFCFA(m.revenue ?? 0)}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Commandes</p>
                      <p className="text-lg font-bold">{m.orderCount ?? 0}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Ticket moyen</p>
                      <p className="text-lg font-bold">{formatFCFA(m.avgTicket ?? 0)}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Stock alerte</p>
                      <p className="text-lg font-bold">{(m.lowStock ?? []).length}</p>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
                    {r.summary}
                  </div>
                  {(m.lowStock ?? []).length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                      <p className="mb-2 flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-4 w-4 text-destructive" /> Stock à réapprovisionner
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                        {(m.lowStock as any[]).slice(0, 5).map((s, i) => (
                          <li key={i}>{s.nom} : {s.quantité} {s.unité} (seuil {s.seuil})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;
