import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  created_at: string;
  user_id: string | null;
}

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  cancel: "destructive",
  adjust: "secondary",
  payment: "default",
};

const AuditLogPage = () => {
  const { restaurant, profile } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      const { data } = await supabase.from("audit_log")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setEntries((data ?? []) as AuditEntry[]);
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
        <h1 className="text-3xl font-bold">Journal d'audit</h1>
        <p className="mt-1 text-muted-foreground">Toutes les actions sensibles tracées (annulations, remises, encaissements).</p>
      </div>
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune entrée pour l'instant.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id}><CardContent className="p-3 flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={ACTION_VARIANT[e.action] ?? "outline"}>{e.action}</Badge>
                  <span className="text-xs text-muted-foreground">{e.entity_type}{e.entity_id ? ` · ${e.entity_id.slice(0, 8)}` : ""}</span>
                </div>
                {e.reason && <p className="text-sm">{e.reason}</p>}
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(e.created_at).toLocaleString("fr-FR")}
              </p>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;