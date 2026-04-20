import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
}
interface EmployeeProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const formatHM = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
};

const TimeClock = () => {
  const { restaurant, profile, user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isOwner = profile?.is_owner ?? false;

  const load = async () => {
    if (!restaurant) return;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const queries: Promise<any>[] = [
      supabase
        .from("time_entries")
        .select("id, user_id, clock_in, clock_out")
        .eq("restaurant_id", restaurant.id)
        .gte("clock_in", since.toISOString())
        .order("clock_in", { ascending: false }),
    ];
    if (isOwner) {
      queries.push(
        supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("restaurant_id", restaurant.id)
      );
    }
    const [eRes, pRes] = await Promise.all(queries);
    setEntries((eRes.data ?? []) as TimeEntry[]);
    if (pRes) setEmployees((pRes.data ?? []) as EmployeeProfile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant, isOwner]);

  const myOpenEntry = useMemo(
    () => entries.find((e) => e.user_id === user?.id && !e.clock_out),
    [entries, user]
  );

  const clockIn = async () => {
    if (!restaurant || !user) return;
    setBusy(true);
    const { error } = await supabase.from("time_entries").insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pointage entrée enregistré");
    load();
  };

  const clockOut = async () => {
    if (!myOpenEntry) return;
    setBusy(true);
    const { error } = await supabase
      .from("time_entries")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", myOpenEntry.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pointage sortie enregistré");
    load();
  };

  // Aggregate per-employee minutes for current week
  const weekStart = useMemo(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const summary = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const ci = new Date(e.clock_in);
      if (ci < weekStart) continue;
      const co = e.clock_out ? new Date(e.clock_out) : new Date();
      const mins = Math.max(0, (co.getTime() - ci.getTime()) / 60000);
      map.set(e.user_id, (map.get(e.user_id) ?? 0) + mins);
    }
    return map;
  }, [entries, weekStart]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pointage</h1>
        <p className="mt-1 text-muted-foreground">Gérez vos heures de travail.</p>
      </div>

      {/* Personal clock-in/out card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Mon pointage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {myOpenEntry ? (
            <div className="rounded-md border bg-accent/30 p-4">
              <p className="text-sm text-muted-foreground">Pointé en service depuis</p>
              <p className="text-2xl font-bold text-primary">
                {new Date(myOpenEntry.clock_in).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Vous n'êtes pas en service actuellement.</p>
          )}
          {myOpenEntry ? (
            <Button onClick={clockOut} disabled={busy} variant="destructive" size="lg" className="w-full">
              <LogOut className="mr-2 h-5 w-5" /> Pointer la sortie
            </Button>
          ) : (
            <Button onClick={clockIn} disabled={busy} size="lg" className="w-full">
              <LogIn className="mr-2 h-5 w-5" /> Pointer l'entrée
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Owner: weekly summary */}
      {isOwner && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Heures cette semaine (depuis lundi)</CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun employé.</p>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => {
                  const mins = summary.get(emp.id) ?? 0;
                  return (
                    <div key={emp.id} className="flex items-center justify-between rounded-md border bg-card p-3">
                      <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                      <Badge variant={mins > 0 ? "default" : "secondary"}>{formatHM(mins)}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Historique récent</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun pointage enregistré.</p>
          ) : (
            <div className="space-y-1.5">
              {entries.slice(0, 20).map((e) => {
                const ci = new Date(e.clock_in);
                const co = e.clock_out ? new Date(e.clock_out) : null;
                const mins = co ? (co.getTime() - ci.getTime()) / 60000 : 0;
                const empName = isOwner
                  ? employees.find((p) => p.id === e.user_id)
                  : null;
                return (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
                    <div>
                      <p className="font-medium">
                        {ci.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}
                        {empName && <span className="ml-2 text-muted-foreground">— {empName.first_name} {empName.last_name}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ci.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {" → "}
                        {co ? co.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "en cours"}
                      </p>
                    </div>
                    {co && <Badge variant="outline">{formatHM(mins)}</Badge>}
                    {!co && <Badge>En cours</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeClock;