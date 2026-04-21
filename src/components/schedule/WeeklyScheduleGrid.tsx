import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Trash2, AlertTriangle, Printer } from "lucide-react";
import { toast } from "sonner";

interface Employee { id: string; first_name: string | null; last_name: string | null; }
interface Template { id: string; name: string; start_time: string; end_time: string; role: string | null; color: string; }
interface Shift {
  id: string; user_id: string; shift_date: string; start_time: string; end_time: string;
  role: string | null; template_id: string | null; status: string;
}
interface Req { day_of_week: number; shift_template_id: string | null; role: string | null; required_count: number; }

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const ROLE_LABELS: Record<string, string> = { manager: "Gérant", waiter: "Serveur", kitchen: "Cuisine", cashier: "Caissier" };

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 dim
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtFR = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

export const WeeklyScheduleGrid = ({ restaurantId, refreshKey = 0 }: { restaurantId: string; refreshKey?: number }) => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogCell, setDialogCell] = useState<{ user_id: string; date: string } | null>(null);
  const [form, setForm] = useState({ template_id: "", custom_start: "11:00", custom_end: "15:00", role: "" });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  const load = async () => {
    setLoading(true);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const [emp, tpl, sh, rq] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name").eq("restaurant_id", restaurantId).order("first_name"),
      supabase.from("shift_templates").select("*").eq("restaurant_id", restaurantId).eq("is_active", true).order("start_time"),
      supabase.from("shifts").select("*").eq("restaurant_id", restaurantId).gte("shift_date", fmtDate(weekStart)).lte("shift_date", fmtDate(weekEnd)),
      supabase.from("staffing_requirements").select("day_of_week, shift_template_id, role, required_count").eq("restaurant_id", restaurantId),
    ]);
    setEmployees((emp.data ?? []) as Employee[]);
    setTemplates((tpl.data ?? []) as Template[]);
    setShifts((sh.data ?? []) as Shift[]);
    setReqs((rq.data ?? []) as Req[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [restaurantId, weekStart, refreshKey]);

  const shiftsFor = (uid: string, date: string) => shifts.filter(s => s.user_id === uid && s.shift_date === date);

  const openAdd = (uid: string, date: string) => {
    setDialogCell({ user_id: uid, date });
    setForm({ template_id: templates[0]?.id ?? "", custom_start: "11:00", custom_end: "15:00", role: "" });
  };

  const addShift = async () => {
    if (!dialogCell) return;
    const tpl = templates.find(t => t.id === form.template_id);
    const payload = {
      restaurant_id: restaurantId,
      user_id: dialogCell.user_id,
      shift_date: dialogCell.date,
      start_time: tpl ? tpl.start_time : form.custom_start,
      end_time: tpl ? tpl.end_time : form.custom_end,
      role: tpl ? tpl.role : (form.role || null),
      template_id: tpl?.id ?? null,
      status: "planned",
    };
    const { error } = await supabase.from("shifts").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Shift ajouté");
    setDialogCell(null);
    load();
  };

  const removeShift = async (id: string) => {
    const { error } = await supabase.from("shifts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  // Coverage: for each (date, template, role) compute assigned vs required
  const understaffing = useMemo(() => {
    const out: { date: string; tplName: string; role: string | null; required: number; assigned: number }[] = [];
    days.forEach(d => {
      const dow = d.getDay(); // 0..6 (sun=0)
      const dateStr = fmtDate(d);
      reqs.filter(r => r.day_of_week === dow).forEach(r => {
        const tpl = templates.find(t => t.id === r.shift_template_id);
        if (!tpl) return;
        const assigned = shifts.filter(s =>
          s.shift_date === dateStr &&
          s.template_id === tpl.id &&
          (r.role ? s.role === r.role : true) &&
          s.status !== "absent"
        ).length;
        if (assigned < r.required_count) {
          out.push({ date: dateStr, tplName: tpl.name, role: r.role, required: r.required_count, assigned });
        }
      });
    });
    return out;
  }, [days, reqs, shifts, templates]);

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + delta * 7); setWeekStart(d);
  };

  const weekLabel = `${fmtFR(days[0])} – ${fmtFR(days[6])} ${days[6].getFullYear()}`;

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => shiftWeek(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>Cette semaine</Button>
            <Button size="icon" variant="outline" onClick={() => shiftWeek(1)}><ChevronRight className="h-4 w-4" /></Button>
            <span className="ml-3 font-semibold capitalize">{weekLabel}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Imprimer
          </Button>
        </div>

        {understaffing.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <AlertTriangle className="h-4 w-4" /> Sous-effectif détecté ({understaffing.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {understaffing.slice(0, 8).map((u, i) => (
                <Badge key={i} variant="destructive" className="text-[10px]">
                  {fmtFR(new Date(u.date))} · {u.tplName}{u.role ? ` (${ROLE_LABELS[u.role] ?? u.role})` : ""} : {u.assigned}/{u.required}
                </Badge>
              ))}
              {understaffing.length > 8 && <Badge variant="secondary">+{understaffing.length - 8}</Badge>}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Chargement…</p>
        ) : employees.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Aucun employé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b p-2 text-left font-medium text-muted-foreground sticky left-0 bg-background z-10 min-w-[140px]">Employé</th>
                  {days.map((d, i) => (
                    <th key={i} className="border-b border-l p-2 text-center font-medium min-w-[120px]">
                      <div>{DAY_LABELS[i]}</div>
                      <div className="text-xs font-normal text-muted-foreground">{fmtFR(d)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="border-b p-2 font-medium sticky left-0 bg-background">
                      {e.first_name} {e.last_name}
                    </td>
                    {days.map((d, i) => {
                      const dateStr = fmtDate(d);
                      const cellShifts = shiftsFor(e.id, dateStr);
                      return (
                        <td key={i} className="border-b border-l p-1 align-top">
                          <div className="space-y-1 min-h-[60px]">
                            {cellShifts.map(s => {
                              const tpl = templates.find(t => t.id === s.template_id);
                              return (
                                <div key={s.id}
                                  className="group relative rounded px-1.5 py-1 text-[11px] text-white"
                                  style={{ background: tpl?.color ?? "hsl(var(--primary))" }}>
                                  <div className="font-semibold truncate">{tpl?.name ?? "Shift"}</div>
                                  <div className="opacity-90">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</div>
                                  {s.role && <div className="opacity-80 truncate">{ROLE_LABELS[s.role] ?? s.role}</div>}
                                  <button
                                    onClick={() => removeShift(s.id)}
                                    className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 transition"
                                    title="Supprimer">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => openAdd(e.id, dateStr)}
                              className="w-full rounded border border-dashed py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                              <Plus className="inline h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!dialogCell} onOpenChange={(o) => !o && setDialogCell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Modèle</Label>
              <Select value={form.template_id || "custom"} onValueChange={(v) => setForm({ ...form, template_id: v === "custom" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.start_time.slice(0, 5)}–{t.end_time.slice(0, 5)})
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Personnalisé…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!form.template_id && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Début</Label><Input type="time" value={form.custom_start} onChange={(e) => setForm({ ...form, custom_start: e.target.value })} /></div>
                  <div><Label>Fin</Label><Input type="time" value={form.custom_end} onChange={(e) => setForm({ ...form, custom_end: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Poste</Label>
                  <Select value={form.role || "any"} onValueChange={(v) => setForm({ ...form, role: v === "any" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">—</SelectItem>
                      {Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCell(null)}>Annuler</Button>
            <Button onClick={addShift}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
