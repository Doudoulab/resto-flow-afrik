import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import { Loader2, Plus, CheckCircle2, FileDown, Calculator } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Period { id: string; period_month: string; status: string; total_gross: number; total_net: number; total_employer_charges: number; }
interface Entry {
  id: string; user_id: string; employee_name: string; hours_worked: number; hourly_rate: number; base_salary: number; bonus: number;
  gross_salary: number; cnss_employee: number; ipres_employee: number; irpp: number; other_deductions: number; total_deductions: number;
  net_salary: number; cnss_employer: number; ipres_employer: number; other_employer: number;
}
interface PayrollSettings {
  cnss_employee_pct: number; cnss_employer_pct: number;
  ipres_employee_pct: number; ipres_employer_pct: number;
  irpp_pct: number; other_employee_pct: number; other_employer_pct: number;
}
interface Profile { id: string; first_name: string | null; last_name: string | null; hourly_rate: number; }

const computeEntry = (hours: number, rate: number, bonus: number, settings: PayrollSettings): Partial<Entry> => {
  const base = hours * rate;
  const gross = base + bonus;
  const cnss_e = (gross * settings.cnss_employee_pct) / 100;
  const ipres_e = (gross * settings.ipres_employee_pct) / 100;
  const irpp = (gross * settings.irpp_pct) / 100;
  const other_e = (gross * settings.other_employee_pct) / 100;
  const total_d = cnss_e + ipres_e + irpp + other_e;
  const net = gross - total_d;
  const cnss_er = (gross * settings.cnss_employer_pct) / 100;
  const ipres_er = (gross * settings.ipres_employer_pct) / 100;
  const other_er = (gross * settings.other_employer_pct) / 100;
  return {
    base_salary: base, gross_salary: gross,
    cnss_employee: cnss_e, ipres_employee: ipres_e, irpp, other_deductions: other_e,
    total_deductions: total_d, net_salary: net,
    cnss_employer: cnss_er, ipres_employer: ipres_er, other_employer: other_er,
  };
};

const Payroll = () => {
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));

  const load = async () => {
    if (!restaurant) return;
    const [p, e, s] = await Promise.all([
      supabase.from("payroll_periods").select("*").eq("restaurant_id", restaurant.id).order("period_month", { ascending: false }),
      supabase.from("profiles").select("id, first_name, last_name, hourly_rate").eq("restaurant_id", restaurant.id),
      supabase.from("payroll_settings").select("*").eq("restaurant_id", restaurant.id).maybeSingle(),
    ]);
    setPeriods((p.data ?? []) as Period[]);
    setEmployees((e.data ?? []) as Profile[]);
    setSettings((s.data ?? null) as PayrollSettings | null);
    if (!activePeriod && p.data?.[0]) setActivePeriod(p.data[0] as Period);
    setLoading(false);
  };

  const loadEntries = async (periodId: string) => {
    const { data } = await supabase.from("payroll_entries").select("*").eq("period_id", periodId).order("employee_name");
    setEntries((data ?? []) as Entry[]);
  };

  useEffect(() => { load(); }, [restaurant]);
  useEffect(() => { if (activePeriod) loadEntries(activePeriod.id); }, [activePeriod]);

  const createPeriod = async () => {
    if (!restaurant) return;
    const { data, error } = await supabase.from("payroll_periods")
      .insert({ restaurant_id: restaurant.id, period_month: newMonth, status: "draft" })
      .select().single();
    if (error) return toast.error(error.message);
    toast.success("Période créée");
    setCreateOpen(false);
    setActivePeriod(data as Period);
    load();
  };

  const generateFromTimeClock = async () => {
    if (!restaurant || !activePeriod || !settings) return;
    const start = startOfMonth(parseISO(activePeriod.period_month));
    const end = endOfMonth(start);
    const { data: te } = await supabase.from("time_entries")
      .select("user_id, clock_in, clock_out")
      .eq("restaurant_id", restaurant.id)
      .gte("clock_in", start.toISOString())
      .lte("clock_in", end.toISOString())
      .not("clock_out", "is", null);
    const hoursByUser: Record<string, number> = {};
    (te ?? []).forEach((t: any) => {
      const h = (new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime()) / 3600000;
      hoursByUser[t.user_id] = (hoursByUser[t.user_id] ?? 0) + h;
    });
    await supabase.from("payroll_entries").delete().eq("period_id", activePeriod.id);
    const inserts = employees.map((emp) => {
      const h = Math.round((hoursByUser[emp.id] ?? 0) * 100) / 100;
      const calc = computeEntry(h, Number(emp.hourly_rate), 0, settings);
      return {
        restaurant_id: restaurant.id, period_id: activePeriod.id, user_id: emp.id,
        employee_name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || "Employé",
        hours_worked: h, hourly_rate: Number(emp.hourly_rate), bonus: 0, ...calc,
      };
    }).filter((e) => e.hours_worked > 0 || (e.hourly_rate ?? 0) > 0);
    if (inserts.length === 0) { toast.warning("Aucun employé avec heures/taux"); return; }
    const { error } = await supabase.from("payroll_entries").insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`${inserts.length} fiche(s) générée(s)`);
    loadEntries(activePeriod.id);
  };

  const updateEntry = async (e: Entry, patch: Partial<Entry>) => {
    if (!settings) return;
    const merged = { ...e, ...patch };
    const calc = computeEntry(Number(merged.hours_worked), Number(merged.hourly_rate), Number(merged.bonus), settings);
    const { error } = await supabase.from("payroll_entries").update({ ...patch, ...calc }).eq("id", e.id);
    if (error) return toast.error(error.message);
    if (activePeriod) loadEntries(activePeriod.id);
  };

  const validatePeriod = async () => {
    if (!activePeriod) return;
    if (!confirm("Valider la période ? Les écritures comptables seront générées.")) return;
    const { error } = await supabase.from("payroll_periods").update({ status: "validated" }).eq("id", activePeriod.id);
    if (error) return toast.error(error.message);
    toast.success("Période validée et écritures comptables générées");
    load();
  };

  const exportPayslip = (e: Entry) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Bulletin de paie — ${e.employee_name}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`${restaurant?.name ?? ""}`, 14, 26);
    doc.text(`Période : ${activePeriod ? format(parseISO(activePeriod.period_month), "MMMM yyyy", { locale: fr }) : ""}`, 14, 32);
    autoTable(doc, {
      startY: 40,
      head: [["Élément", "Base", "Taux", "Montant"]],
      body: [
        ["Salaire de base", `${e.hours_worked} h`, formatFCFA(e.hourly_rate), formatFCFA(e.base_salary)],
        ["Prime", "", "", formatFCFA(e.bonus)],
        ["Salaire brut", "", "", formatFCFA(e.gross_salary)],
        ["CNSS (salarié)", "", "", `-${formatFCFA(e.cnss_employee)}`],
        ["IPRES (salarié)", "", "", `-${formatFCFA(e.ipres_employee)}`],
        ["IRPP", "", "", `-${formatFCFA(e.irpp)}`],
        ["Autres retenues", "", "", `-${formatFCFA(e.other_deductions)}`],
        ["NET À PAYER", "", "", formatFCFA(e.net_salary)],
      ],
      headStyles: { fillColor: [37, 99, 235] },
    });
    autoTable(doc, {
      head: [["Charges patronales", "Montant"]],
      body: [
        ["CNSS (employeur)", formatFCFA(e.cnss_employer)],
        ["IPRES (employeur)", formatFCFA(e.ipres_employer)],
        ["Coût total employeur", formatFCFA(e.gross_salary + e.cnss_employer + e.ipres_employer + e.other_employer)],
      ],
      headStyles: { fillColor: [148, 163, 184] },
    });
    doc.save(`bulletin-${e.employee_name}-${activePeriod?.period_month}.pdf`);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Paie</h1>
          <p className="mt-1 text-muted-foreground">Génération automatique depuis le pointage avec charges sociales.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle période</Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label>Période active</Label>
          <div className="flex flex-wrap gap-2">
            {periods.length === 0 && <p className="text-sm text-muted-foreground">Aucune période. Créez-en une.</p>}
            {periods.map((p) => (
              <Button key={p.id} variant={activePeriod?.id === p.id ? "default" : "outline"} size="sm" onClick={() => setActivePeriod(p)}>
                {format(parseISO(p.period_month), "MMM yyyy", { locale: fr })}
                {p.status === "validated" && <CheckCircle2 className="ml-2 h-3 w-3" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activePeriod && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{format(parseISO(activePeriod.period_month), "MMMM yyyy", { locale: fr })}</h2>
              <Badge variant={activePeriod.status === "validated" ? "default" : "outline"}>{activePeriod.status}</Badge>
            </div>
            <div className="flex gap-2">
              {activePeriod.status === "draft" && (
                <>
                  <Button variant="outline" onClick={generateFromTimeClock}><Calculator className="mr-2 h-4 w-4" />Générer depuis pointage</Button>
                  <Button onClick={validatePeriod}><CheckCircle2 className="mr-2 h-4 w-4" />Valider la période</Button>
                </>
              )}
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Fiches de paie</CardTitle></CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Aucune fiche. Cliquez sur "Générer depuis pointage" ou ajoutez manuellement.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Heures</TableHead>
                      <TableHead>Taux</TableHead>
                      <TableHead>Prime</TableHead>
                      <TableHead>Brut</TableHead>
                      <TableHead>Retenues</TableHead>
                      <TableHead className="font-semibold">Net</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.employee_name}</TableCell>
                        <TableCell>
                          <Input type="number" step="0.25" className="w-20" value={e.hours_worked}
                            disabled={activePeriod.status !== "draft"}
                            onChange={(ev) => updateEntry(e, { hours_worked: parseFloat(ev.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="w-24" value={e.hourly_rate}
                            disabled={activePeriod.status !== "draft"}
                            onChange={(ev) => updateEntry(e, { hourly_rate: parseFloat(ev.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="w-24" value={e.bonus}
                            disabled={activePeriod.status !== "draft"}
                            onChange={(ev) => updateEntry(e, { bonus: parseFloat(ev.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>{formatFCFA(e.gross_salary)}</TableCell>
                        <TableCell className="text-destructive">-{formatFCFA(e.total_deductions)}</TableCell>
                        <TableCell className="font-semibold">{formatFCFA(e.net_salary)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => exportPayslip(e)}><FileDown className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total brut</p><p className="text-2xl font-bold">{formatFCFA(entries.reduce((s, e) => s + Number(e.gross_salary), 0))}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total net</p><p className="text-2xl font-bold">{formatFCFA(entries.reduce((s, e) => s + Number(e.net_salary), 0))}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Charges patronales</p><p className="text-2xl font-bold">{formatFCFA(entries.reduce((s, e) => s + Number(e.cnss_employer) + Number(e.ipres_employer) + Number(e.other_employer), 0))}</p></CardContent></Card>
          </div>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle période de paie</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Mois</Label>
            <Input type="month" value={newMonth.slice(0, 7)} onChange={(e) => setNewMonth(`${e.target.value}-01`)} />
          </div>
          <DialogFooter><Button onClick={createPeriod}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;