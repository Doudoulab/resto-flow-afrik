import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, LogIn, LogOut, Clock, FileDown, KeyRound, Delete } from "lucide-react";
import { toast } from "sonner";
import { exportPayslipPDF } from "@/lib/exports";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { enqueue } from "@/lib/offline/db";

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
  hourly_rate?: number;
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
  const [kioskMode, setKioskMode] = useState(false);
  const [pinDigits, setPinDigits] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [lastPunch, setLastPunch] = useState<{ name: string; action: string; at: string } | null>(null);

  const isOwner = profile?.is_owner ?? false;

  const load = async () => {
    if (!restaurant) return;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const eRes = await supabase
      .from("time_entries")
      .select("id, user_id, clock_in, clock_out")
      .eq("restaurant_id", restaurant.id)
      .gte("clock_in", since.toISOString())
      .order("clock_in", { ascending: false });

    let pRes: any = null;
    if (isOwner) {
      pRes = await supabase
        .from("profiles")
        .select("id, first_name, last_name, hourly_rate")
        .eq("restaurant_id", restaurant.id);
    }

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
    if (!navigator.onLine) {
      await enqueue({
        kind: "time_clock_in",
        payload: { restaurant_id: restaurant.id, user_id: user.id, clock_in: new Date().toISOString() },
      });
      setBusy(false);
      toast.success("Pointage enregistré hors-ligne, synchro au retour");
      return;
    }
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
    if (!navigator.onLine) {
      await enqueue({
        kind: "time_clock_out",
        payload: { entry_id: myOpenEntry.id, clock_out: new Date().toISOString() },
      });
      setBusy(false);
      toast.success("Sortie enregistrée hors-ligne, synchro au retour");
      return;
    }
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

  const punchWithPin = async (code: string) => {
    if (!restaurant) return;
    if (!/^[0-9]{4,6}$/.test(code)) return;
    setPinBusy(true);
    const { data, error } = await supabase.rpc("punch_with_pin", {
      _restaurant_id: restaurant.id,
      _pin: code,
    });
    setPinBusy(false);
    setPinDigits("");
    if (error) {
      toast.error(error.message || "PIN incorrect");
      return;
    }
    const row = (data as any)?.[0];
    if (!row) { toast.error("PIN incorrect"); return; }
    setLastPunch({
      name: row.employee_name,
      action: row.action,
      at: row.at,
    });
    toast.success(`${row.action === "clock_in" ? "Entrée" : "Sortie"} — ${row.employee_name}`);
    load();
    setTimeout(() => setLastPunch(null), 6000);
  };

  const onPinKey = (k: string) => {
    if (pinBusy) return;
    if (k === "del") { setPinDigits((p) => p.slice(0, -1)); return; }
    if (k === "ok") { punchWithPin(pinDigits); return; }
    setPinDigits((p) => {
      const next = (p + k).slice(0, 6);
      if (next.length >= 4 && k !== "" && next.length === 6) {
        // auto-submit at 6 digits
        setTimeout(() => punchWithPin(next), 50);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Pointage</h1>
            <p className="mt-1 text-muted-foreground">Gérez vos heures de travail.</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="kiosk" className="text-sm font-medium">Mode kiosque (PIN)</Label>
            <Switch id="kiosk" checked={kioskMode} onCheckedChange={setKioskMode} />
          </div>
        </div>
      </div>

      {kioskMode && (
        <Card className="border-primary/40 bg-accent/20 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> Pointage par PIN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
              <div className="flex h-14 items-center justify-center rounded-md border bg-background px-4 font-mono text-2xl tracking-[0.6em] w-full">
                {pinDigits.padEnd(4, "•").split("").map((c, i) => (
                  <span key={i} className={i < pinDigits.length ? "text-foreground" : "text-muted-foreground/40"}>
                    {i < pinDigits.length ? "•" : "•"}
                  </span>
                ))}
              </div>
              <div className="grid w-full grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9"].map((k) => (
                  <Button key={k} type="button" variant="outline" size="lg" className="h-14 text-xl" onClick={() => onPinKey(k)} disabled={pinBusy}>
                    {k}
                  </Button>
                ))}
                <Button type="button" variant="outline" size="lg" className="h-14" onClick={() => onPinKey("del")} disabled={pinBusy || pinDigits.length === 0}>
                  <Delete className="h-5 w-5" />
                </Button>
                <Button type="button" variant="outline" size="lg" className="h-14 text-xl" onClick={() => onPinKey("0")} disabled={pinBusy}>
                  0
                </Button>
                <Button type="button" size="lg" className="h-14" onClick={() => onPinKey("ok")} disabled={pinBusy || pinDigits.length < 4}>
                  {pinBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : "OK"}
                </Button>
              </div>
              {lastPunch && (
                <div className={`w-full rounded-md border p-3 text-center text-sm ${lastPunch.action === "clock_in" ? "border-primary/40 bg-primary/10" : "border-destructive/40 bg-destructive/10"}`}>
                  <p className="font-semibold">{lastPunch.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lastPunch.action === "clock_in" ? "Entrée enregistrée" : "Sortie enregistrée"} à {new Date(lastPunch.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Demander aux employés de saisir leur PIN. Idéal pour une tablette partagée à l'entrée du service.
            </p>
          </CardContent>
        </Card>
      )}

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
            <CardTitle className="text-base">Heures & fiches de paie</CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun employé.</p>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => {
                  const mins = summary.get(emp.id) ?? 0;
                  const handlePayslip = () => {
                    const now = new Date();
                    const monthStart = startOfMonth(now);
                    const monthEnd = endOfMonth(now);
                    const empEntries = entries
                      .filter((e) => e.user_id === emp.id && e.clock_out)
                      .filter((e) => {
                        const ci = parseISO(e.clock_in);
                        return ci >= monthStart && ci <= monthEnd;
                      })
                      .sort((a, b) => a.clock_in.localeCompare(b.clock_in))
                      .map((e) => {
                        const ci = parseISO(e.clock_in);
                        const co = parseISO(e.clock_out!);
                        return {
                          date: format(ci, "dd/MM/yyyy"),
                          clockIn: format(ci, "HH:mm"),
                          clockOut: format(co, "HH:mm"),
                          minutes: (co.getTime() - ci.getTime()) / 60000,
                        };
                      });
                    if (empEntries.length === 0) {
                      toast.error("Aucun pointage clôturé ce mois-ci");
                      return;
                    }
                    if (!emp.hourly_rate || emp.hourly_rate <= 0) {
                      toast.error("Définissez d'abord un taux horaire dans Personnel");
                      return;
                    }
                    exportPayslipPDF({
                      restaurantName: restaurant?.name || "Restaurant",
                      employeeName: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || "Employé",
                      monthLabel: format(now, "MMMM-yyyy", { locale: fr }),
                      hourlyRate: emp.hourly_rate ?? 0,
                      entries: empEntries,
                    });
                    toast.success("Fiche de paie générée");
                  };
                  return (
                    <div key={emp.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3">
                      <div>
                        <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(emp.hourly_rate ?? 0).toLocaleString("fr-FR")} FCFA / h
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={mins > 0 ? "default" : "secondary"}>{formatHM(mins)} (sem.)</Badge>
                        <Button size="sm" variant="outline" onClick={handlePayslip}>
                          <FileDown className="mr-2 h-3 w-3" /> Fiche de paie
                        </Button>
                      </div>
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