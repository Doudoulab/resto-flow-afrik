import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, CalendarDays, Trash2, MessageCircle, AlertTriangle, PartyPopper, Wallet } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isFuture, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ReservationCalendar } from "@/components/reservations/ReservationCalendar";
import { formatFCFA } from "@/lib/currency";

type Status = "confirmed" | "cancelled" | "honored" | "no_show";

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  reserved_at: string;
  table_number: string | null;
  notes: string | null;
  status: Status;
  deposit_amount: number;
  deposit_status: string;
  estimated_duration_min: number;
  allergies: string | null;
  special_occasion: string | null;
}

const STATUS_META: Record<Status, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Confirmée", variant: "default" },
  honored: { label: "Honorée", variant: "secondary" },
  cancelled: { label: "Annulée", variant: "outline" },
  no_show: { label: "Absent", variant: "destructive" },
};

const Reservations = () => {
  const { restaurant } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"today" | "upcoming" | "all">("today");
  const [view, setView] = useState<"list" | "calendar">("list");

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    party_size: "2",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "19:00",
    table_number: "",
    notes: "",
    deposit_amount: "0",
    duration: "90",
    allergies: "",
    special_occasion: "",
  });

  const load = async () => {
    if (!restaurant) return;
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("reserved_at", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Reservation[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant]);

  const handleCreate = async () => {
    if (!restaurant) return;
    if (!form.customer_name.trim()) {
      toast.error("Le nom du client est requis");
      return;
    }
    const reserved_at = new Date(`${form.date}T${form.time}:00`).toISOString();
    const { error } = await supabase.from("reservations").insert({
      restaurant_id: restaurant.id,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim() || null,
      party_size: parseInt(form.party_size, 10) || 1,
      reserved_at,
      table_number: form.table_number.trim() || null,
      notes: form.notes.trim() || null,
      deposit_amount: parseFloat(form.deposit_amount) || 0,
      deposit_status: parseFloat(form.deposit_amount) > 0 ? "pending" : "none",
      estimated_duration_min: parseInt(form.duration, 10) || 90,
      allergies: form.allergies.trim() || null,
      special_occasion: form.special_occasion.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Réservation créée");
    setOpen(false);
    setForm({ ...form, customer_name: "", customer_phone: "", table_number: "", notes: "", deposit_amount: "0", allergies: "", special_occasion: "" });
    load();
  };

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Statut mis à jour");
    load();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Réservation supprimée");
    load();
  };

  const markDepositPaid = async (id: string) => {
    const { error } = await supabase.from("reservations").update({ deposit_status: "paid" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Acompte encaissé");
    load();
  };

  const buildWhatsAppLink = (r: Reservation) => {
    if (!r.customer_phone) return null;
    const phone = r.customer_phone.replace(/\D/g, "");
    const dt = format(parseISO(r.reserved_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr });
    const msg = `Bonjour ${r.customer_name}, nous confirmons votre réservation chez ${restaurant?.name} le ${dt} pour ${r.party_size} personne(s)${r.table_number ? ` (table ${r.table_number})` : ""}.${r.deposit_amount > 0 && r.deposit_status !== "paid" ? ` Acompte demandé : ${formatFCFA(r.deposit_amount)}.` : ""} À bientôt !`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const sendReminder = async (r: Reservation) => {
    const link = buildWhatsAppLink(r);
    if (!link) { toast.error("Numéro de téléphone manquant"); return; }
    window.open(link, "_blank");
    await supabase.from("reservations").update({ reminder_sent_at: new Date().toISOString() }).eq("id", r.id);
    load();
  };

  const filtered = items.filter((r) => {
    const d = parseISO(r.reserved_at);
    if (filter === "today") return isToday(d);
    if (filter === "upcoming") return isFuture(d) || isToday(d);
    return true;
  });

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Réservations</h1>
          <p className="mt-1 text-muted-foreground">Gérez les réservations de {restaurant?.name}.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouvelle réservation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle réservation</DialogTitle>
              <DialogDescription>Renseignez les détails du client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nom du client *</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Heure *</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Couverts</Label>
                  <Input type="number" min="1" value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} />
                </div>
                <div>
                  <Label>Table</Label>
                  <Input value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Durée (min)</Label>
                  <Input type="number" min="30" step="15" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
                <div>
                  <Label>Acompte (FCFA)</Label>
                  <Input type="number" min="0" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Allergies</Label>
                <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Arachides, gluten…" />
              </div>
              <div>
                <Label>Occasion spéciale</Label>
                <Input value={form.special_occasion} onChange={(e) => setForm({ ...form, special_occasion: e.target.value })} placeholder="Anniversaire, demande en mariage…" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {[
            { key: "today" as const, label: "Aujourd'hui" },
            { key: "upcoming" as const, label: "À venir" },
            { key: "all" as const, label: "Toutes" },
          ].map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>Liste</Button>
          <Button size="sm" variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}>Calendrier 7j</Button>
        </div>
      </div>

      {view === "calendar" && (
        <ReservationCalendar
          reservations={items.map((r) => ({
            id: r.id, customer_name: r.customer_name, party_size: r.party_size,
            reserved_at: r.reserved_at, table_number: r.table_number, status: r.status,
          }))}
          onSelect={(id) => {
            const el = document.getElementById(`res-${id}`);
            setView("list");
            setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
          }}
        />
      )}

      {view === "list" && (filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 opacity-40" />
            Aucune réservation pour cette période.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <Card key={r.id} id={`res-${r.id}`} className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{r.customer_name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {format(parseISO(r.reserved_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
                      {" • "} {r.party_size} couverts
                      {r.table_number && ` • Table ${r.table_number}`}
                      {r.estimated_duration_min ? ` • ${r.estimated_duration_min} min` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={STATUS_META[r.status].variant}>{STATUS_META[r.status].label}</Badge>
                    {r.deposit_amount > 0 && (
                      <Badge variant={r.deposit_status === "paid" ? "default" : "outline"} className="text-[10px]">
                        Acompte {formatFCFA(r.deposit_amount)} {r.deposit_status === "paid" ? "✓" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.customer_phone && <p className="text-sm">📞 {r.customer_phone}</p>}
                {r.allergies && (
                  <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span><strong>Allergies :</strong> {r.allergies}</span>
                  </p>
                )}
                {r.special_occasion && (
                  <p className="flex items-center gap-2 text-sm text-primary">
                    <PartyPopper className="h-4 w-4" /> {r.special_occasion}
                  </p>
                )}
                {r.notes && <p className="text-sm text-muted-foreground italic">"{r.notes}"</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_META) as Status[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {r.customer_phone && (
                    <Button variant="outline" size="sm" onClick={() => sendReminder(r)}>
                      <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                    </Button>
                  )}
                  {r.deposit_amount > 0 && r.deposit_status !== "paid" && (
                    <Button variant="outline" size="sm" onClick={() => markDepositPaid(r.id)}>
                      <Wallet className="mr-2 h-4 w-4" /> Acompte payé
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeItem(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Reservations;
