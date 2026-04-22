import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Check, X, Loader2, CalendarOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Employee { id: string; first_name: string | null; last_name: string | null; }
interface Leave {
  id: string; user_id: string; leave_type: string; start_date: string; end_date: string;
  days_count: number; reason: string | null; status: string; created_at: string;
}

const TYPES = [
  { v: "paid", l: "Congés payés" },
  { v: "sick", l: "Maladie" },
  { v: "unpaid", l: "Sans solde" },
  { v: "other", l: "Autre" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente", approved: "Approuvé", rejected: "Refusé",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", approved: "default", rejected: "destructive",
};

export function LeavesManager({ restaurantId, employees }: { restaurantId: string; employees: Employee[] }) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    leave_type: "paid",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
  });

  const load = async () => {
    const { data } = await supabase
      .from("employee_leaves")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("start_date", { ascending: false });
    setLeaves((data ?? []) as Leave[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "Employé" : "—";
  };

  const submit = async () => {
    if (!form.user_id) { toast.error("Choisissez un employé"); return; }
    const days = differenceInCalendarDays(parseISO(form.end_date), parseISO(form.start_date)) + 1;
    if (days <= 0) { toast.error("Dates invalides"); return; }
    setBusy(true);
    const { error } = await supabase.from("employee_leaves").insert({
      restaurant_id: restaurantId,
      user_id: form.user_id,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days_count: days,
      reason: form.reason || null,
      status: "pending",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande enregistrée");
    setOpen(false);
    setForm({ ...form, reason: "" });
    load();
  };

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("employee_leaves")
      .update({ status, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Approuvé" : "Refusé");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette demande ?")) return;
    await supabase.from("employee_leaves").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouvelle demande</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle demande de congé</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Employé *</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Du</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Au</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Motif (optionnel)</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {leaves.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <CalendarOff className="h-8 w-8" />
            <p>Aucune demande de congé.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {leaves.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium">{empName(l.user_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPES.find((t) => t.v === l.leave_type)?.l} · {format(parseISO(l.start_date), "dd MMM", { locale: fr })} → {format(parseISO(l.end_date), "dd MMM yyyy", { locale: fr })} · {l.days_count} j
                  </p>
                  {l.reason && <p className="mt-1 text-xs italic text-muted-foreground">« {l.reason} »</p>}
                </div>
                <Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                {l.status === "pending" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setStatus(l.id, "approved")}>
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(l.id, "rejected")}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
                <Button size="icon" variant="ghost" onClick={() => remove(l.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}