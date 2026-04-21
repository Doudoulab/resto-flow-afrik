import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";

interface Supplier { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; notes: string | null; }

const Suppliers = () => {
  const { restaurant } = useAuth();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", contact_name: "", phone: "", email: "", notes: "" });

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase.from("suppliers").select("*").eq("restaurant_id", restaurant.id).order("name");
    setItems((data ?? []) as Supplier[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant]);

  const openDialog = (s?: Supplier) => {
    if (s) { setEditing(s); setForm({ name: s.name, contact_name: s.contact_name ?? "", phone: s.phone ?? "", email: s.email ?? "", notes: s.notes ?? "" }); }
    else { setEditing(null); setForm({ name: "", contact_name: "", phone: "", email: "", notes: "" }); }
    setOpen(true);
  };

  const save = async () => {
    if (!restaurant || !form.name.trim()) return toast.error("Nom requis");
    const payload = { restaurant_id: restaurant.id, name: form.name, contact_name: form.contact_name || null, phone: form.phone || null, email: form.email || null, notes: form.notes || null };
    const res = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Fournisseur mis à jour" : "Fournisseur ajouté");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Fournisseurs</h1>
          <p className="mt-1 text-muted-foreground">Gérez vos fournisseurs pour les bons de réception.</p>
        </div>
        <Button onClick={() => openDialog()}><Plus className="mr-2 h-4 w-4" />Fournisseur</Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun fournisseur.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id}><CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.contact_name && <p className="text-sm text-muted-foreground">{s.contact_name}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openDialog(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              {s.phone && <p className="text-sm flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" />{s.phone}</p>}
              {s.email && <p className="text-sm flex items-center gap-2 text-muted-foreground"><Mail className="h-3 w-3" />{s.email}</p>}
              {s.notes && <p className="text-xs mt-2 text-muted-foreground">{s.notes}</p>}
            </CardContent></Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau fournisseur"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contact</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;
