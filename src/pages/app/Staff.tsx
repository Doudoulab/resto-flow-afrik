import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, Copy, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";

interface Employee { id: string; first_name: string | null; last_name: string | null; is_owner: boolean; }
interface Role { user_id: string; role: string; }
interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  manager: "Gérant",
  waiter: "Serveur",
  kitchen: "Cuisine",
  cashier: "Caissier",
};

const Staff = () => {
  const { restaurant, profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "waiter" });

  const load = async () => {
    if (!restaurant) return;
    const [empRes, roleRes, invRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, is_owner").eq("restaurant_id", restaurant.id),
      supabase.from("user_roles").select("user_id, role").eq("restaurant_id", restaurant.id),
      supabase.from("employee_invitations").select("*").eq("restaurant_id", restaurant.id).is("accepted_at", null).order("created_at", { ascending: false }),
    ]);
    setEmployees((empRes.data ?? []) as Employee[]);
    setRoles((roleRes.data ?? []) as Role[]);
    setInvitations((invRes.data ?? []) as Invitation[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant]);

  const handleInvite = async () => {
    if (!restaurant || !profile) return;
    if (!form.email.trim() || !form.email.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    const { error } = await supabase.from("employee_invitations").insert({
      restaurant_id: restaurant.id,
      email: form.email.trim().toLowerCase(),
      role: form.role as "manager" | "waiter" | "kitchen" | "cashier",
      invited_by: profile.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Invitation créée — partagez le lien avec votre employé");
    setOpen(false);
    setForm({ email: "", role: "waiter" });
    load();
  };

  const inviteUrl = (token: string) => `${window.location.origin}/invitation/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(inviteUrl(token));
    toast.success("Lien copié !");
  };

  const removeInvite = async (id: string) => {
    const { error } = await supabase.from("employee_invitations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const rolesFor = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Personnel</h1>
          <p className="mt-1 text-muted-foreground">Membres de l'équipe ayant accès à {restaurant?.name}.</p>
        </div>
        {profile?.is_owner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" /> Inviter un employé</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Inviter un employé</DialogTitle>
                <DialogDescription>Un lien unique sera généré à partager avec votre employé.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="employe@email.com" />
                </div>
                <div>
                  <Label>Rôle *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={handleInvite}>Créer l'invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {profile?.is_owner && invitations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Invitations en attente ({invitations.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[inv.role] ?? inv.role}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)}>
                  <Copy className="mr-2 h-3 w-3" /> Copier le lien
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeInvite(inv.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {employees.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucun membre rattaché à votre restaurant.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {employees.map((e) => {
            const initials = `${e.first_name?.[0] ?? ""}${e.last_name?.[0] ?? ""}`.toUpperCase() || "?";
            const userRoles = rolesFor(e.id);
            return (
              <Card key={e.id} className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{e.first_name} {e.last_name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.is_owner && <Badge>Propriétaire</Badge>}
                      {userRoles.map((r) => (
                        <Badge key={r} variant="secondary">{ROLE_LABELS[r] ?? r}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Staff;
