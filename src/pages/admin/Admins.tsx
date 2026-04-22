import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, MailPlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformAdmin, type PlatformRole } from "@/hooks/usePlatformAdmin";

const ROLE_LABEL: Record<PlatformRole, string> = {
  super_admin: "Super-admin",
  support: "Support",
  finance: "Finance",
  viewer: "Lecteur",
};
const ROLE_DESC: Record<PlatformRole, string> = {
  super_admin: "Tout : gestion admins, restos, paiements, suspension",
  support: "Restos, abonnements, webhooks. Pas de gestion d'admins.",
  finance: "Lecture restos + abonnements + statistiques financières.",
  viewer: "Lecture seule de la vue d'ensemble et statistiques.",
};
const ROLE_COLOR: Record<PlatformRole, string> = {
  super_admin: "destructive",
  support: "default",
  finance: "secondary",
  viewer: "outline",
};

export default function Admins() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { can } = usePlatformAdmin();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PlatformRole>("support");
  const [notes, setNotes] = useState("");

  const { data: assignments, isLoading: loadingAssign } = useQuery({
    queryKey: ["platform-role-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_role_assignments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invites, isLoading: loadingInvites } = useQuery({
    queryKey: ["platform-role-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_role_invites")
        .select("*")
        .is("consumed_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invite = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    const { error } = await supabase.from("platform_role_invites").upsert(
      { email: cleanEmail, role, notes: notes || null, invited_by: user?.id, consumed_at: null },
      { onConflict: "email" },
    );
    if (error) { toast.error(error.message); return; }
    toast.success(`Invitation enregistrée pour ${cleanEmail}. Le rôle sera attribué à sa première connexion.`);
    setOpen(false); setEmail(""); setNotes(""); setRole("support");
    qc.invalidateQueries({ queryKey: ["platform-role-invites"] });
    qc.invalidateQueries({ queryKey: ["platform-role-assignments"] });
  };

  const updateRole = async (id: string, newRole: PlatformRole) => {
    const { error } = await supabase.from("platform_role_assignments").update({ role: newRole }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rôle mis à jour");
    qc.invalidateQueries({ queryKey: ["platform-role-assignments"] });
  };

  const removeAssignment = async (id: string) => {
    const { error } = await supabase.from("platform_role_assignments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Accès retiré");
    qc.invalidateQueries({ queryKey: ["platform-role-assignments"] });
  };

  const removeInvite = async (id: string) => {
    const { error } = await supabase.from("platform_role_invites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Invitation supprimée");
    qc.invalidateQueries({ queryKey: ["platform-role-invites"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" /> Équipe plateforme</h1>
          <p className="text-muted-foreground mt-1">Membres ayant accès au panel super-admin et leurs rôles.</p>
        </div>
        {can.manageAdmins && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Inviter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Inviter un membre</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" autoFocus />
                </div>
                <div>
                  <Label>Rôle</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as PlatformRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABEL) as PlatformRole[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          <div className="flex flex-col">
                            <span className="font-medium">{ROLE_LABEL[r]}</span>
                            <span className="text-xs text-muted-foreground">{ROLE_DESC[r]}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Notes (optionnel)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex : responsable comptabilité" /></div>
                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <MailPlus className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>L'invité doit créer un compte (ou se connecter) avec cette adresse e-mail. Le rôle est attribué automatiquement à sa première connexion.</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={invite} disabled={!email}>Envoyer l'invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Membres actifs</h2>
          <p className="text-xs text-muted-foreground">Comptes ayant déjà accès au panel.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Ajouté le</TableHead>
              {can.manageAdmins && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingAssign && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>}
            {!loadingAssign && assignments?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun membre actif</TableCell></TableRow>}
            {assignments?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.email}</TableCell>
                <TableCell>
                  {can.manageAdmins && a.user_id !== user?.id ? (
                    <Select value={a.role} onValueChange={(v) => updateRole(a.id, v as PlatformRole)}>
                      <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABEL) as PlatformRole[]).map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={ROLE_COLOR[a.role as PlatformRole] as any}>{ROLE_LABEL[a.role as PlatformRole] ?? a.role}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.notes || "—"}</TableCell>
                <TableCell className="text-sm">{new Date(a.created_at).toLocaleDateString("fr-FR")}</TableCell>
                {can.manageAdmins && (
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" disabled={a.user_id === user?.id}><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Retirer cet accès ?</AlertDialogTitle>
                          <AlertDialogDescription>{a.email} perdra immédiatement l'accès au panel /admin.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeAssignment(a.id)}>Retirer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Invitations en attente</h2>
          <p className="text-xs text-muted-foreground">Comptes pré-autorisés. Le rôle est attribué à la première connexion.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Créée le</TableHead>
              {can.manageAdmins && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingInvites && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>}
            {!loadingInvites && invites?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune invitation en attente</TableCell></TableRow>}
            {invites?.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.email}</TableCell>
                <TableCell><Badge variant={ROLE_COLOR[i.role as PlatformRole] as any}>{ROLE_LABEL[i.role as PlatformRole]}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.notes || "—"}</TableCell>
                <TableCell className="text-sm">{new Date(i.created_at).toLocaleDateString("fr-FR")}</TableCell>
                {can.manageAdmins && (
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => removeInvite(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}