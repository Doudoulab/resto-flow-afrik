import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Bug } from "lucide-react";

interface ErrorEntry {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  url: string | null;
  created_at: string;
}

const LEVEL_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  error: "destructive",
  warn: "secondary",
  info: "outline",
};

const ErrorsPage = () => {
  const { restaurant, profile } = useAuth();
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      const { data } = await supabase
        .from("error_logs")
        .select("id,level,message,stack,url,created_at")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setEntries((data ?? []) as ErrorEntry[]);
      setLoading(false);
    })();
  }, [restaurant]);

  if (!profile?.is_owner) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8" />
        Réservé au propriétaire du restaurant.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bug className="h-7 w-7 text-primary" /> Monitoring d'erreurs
        </h1>
        <p className="mt-1 text-muted-foreground">
          Erreurs récentes capturées côté navigateur (200 dernières).
        </p>
      </div>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucune erreur enregistrée. 🎉
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={LEVEL_VARIANT[e.level] ?? "outline"}>{e.level}</Badge>
                    <span className="text-sm font-medium">{e.message}</span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                {e.url && <p className="text-xs text-muted-foreground truncate">{e.url}</p>}
                {e.stack && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Stack trace</summary>
                    <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-[10px]">
                      {e.stack}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrorsPage;