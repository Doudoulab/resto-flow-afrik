import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, UserPlus, Copy, Trash2, Mail, IdCard, BadgeCheck, Wallet, CalendarDays, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmployeeProfileDialog } from "@/components/staff/EmployeeProfileDialog";
import { AddEmployeeDialog } from "@/components/staff/AddEmployeeDialog";
import { LeavesManager } from "@/components/staff/LeavesManager";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { formatFCFA } from "@/lib/currency";

interface Employee { id: string; first_name: string | null; last_name: string | null; is_owner: boolean; hourly_rate: number; }
interface EmployeeDetail {
  user_id: string; job_title: string | null; base_salary: number; hourly_rate: number;
  contract_type: string; hired_at: string | null; is_active: boolean; deleted_at: string | null;
}
interface Role { user_id: string; role: string; }
interface Invitation {
  id: string; email: string; role: string; token: string; accepted_at: string | null; expires_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  manager: "Gérant", waiter: "Serveur", kitchen: "Cuisine", cashier: "Caissier",
};

const Staff = () => {
  const { restaurant, profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [details, setDetails] = useState<EmployeeDetail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEmp, setProfileEmp] = useState<Employee | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedEmps, setDeletedEmps] = useState<Employee[]>([]);

  const load = async () => {
    if (!restaurant) return;
    const [empRes, detRes, roleRes, invRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, is_owner, hourly_rate").eq("restaurant_id", restaurant.id).is("deleted_at", null),
      supabase.from("employee_details").select("user_id, job_title, base_salary, hourly_rate, contract_type, hired_at, is_active, deleted_at").eq("restaurant_id", restaurant.id),
      supabase.from("user_roles").select("user_id, role").eq("restaurant_id", restaurant.id),
      supabase.from("employee_invitations").select("*").eq("restaurant_id", restaurant.id).is("accepted_at", null).order("created_at", { ascending: false }),
    ]);
    setEmployees((empRes.data ?? []) as Employee[]);
    setDetails((detRes.data ?? []) as EmployeeDetail[]);
    setRoles((roleRes.data ?? []) as Role[]);
    setInvitations((invRes.data ?? []) as Invitation[]);
    // Soft-deleted (restaurant_id was nulled by RPC, look via employee_details)
    const { data: del } = await supabase
      .from("employee_details")
      .select("user_id, deleted_at, profiles:user_id(id, first_name, last_name, is_owner, hourly_rate)")
      .eq("restaurant_id", restaurant.id)
      .not("deleted_at", "is", null);
    setDeletedEmps((del ?? []).map((d: any) => d.profiles).filter(Boolean) as Employee[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant]);

  const inviteUrl = (token: string) => `${window.location.origin}/invitation/${token}`;
  const copyLink = (token: string) => { navigator.clipboard.writeText(inviteUrl(token)); toast.success("Lien copié !"); };
  const removeInvite = async (id: string) => {
    const { error } = await supabase.from("employee_invitations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const toggleActive = async (uid: string, currentlyActive: boolean) => {
    const { error } = await supabase.from("employee_details")
      .update({ is_active: !currentlyActive })
      .eq("user_id", uid).eq("restaurant_id", restaurant!.id);
    if (error) { toast.error(error.message); return; }
    toast.success(currentlyActive ? "Employé désactivé" : "Employé réactivé");
    load();
  };

  const deleteEmployee = async (uid: string) => {
    const { error } = await supabase.rpc("soft_delete_employee", { _user_id: uid });
    if (error) { toast.error(error.message); return; }
    toast.success("Employé supprimé. L'historique est conservé.");
    load();
  };

  const restoreEmployee = async (uid: string) => {
    const { error } = await supabase.rpc("restore_employee", {
      _user_id: uid, _restaurant_id: restaurant!.id, _role: "waiter",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Employé restauré (rôle Serveur par défaut).");
    load();
  };

  const openProfile = (emp: Employee) => { setProfileEmp(emp); setProfileOpen(true); };
  const detailFor = (uid: string) => details.find((d) => d.user_id === uid);
  const rolesFor = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);
  const initials = (e: Employee) => `${e.first_name?.[0] ?? ""}${e.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Employés &amp; salaires</h1>
          <p className="mt-1 text-muted-foreground">Gestion du personnel, des congés et de la masse salariale.</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto h-auto justify-start sm:grid sm:grid-cols-4">
          <TabsTrigger value="list" className="text-xs sm:text-sm whitespace-nowrap"><BadgeCheck className="mr-1.5 h-4 w-4" />Liste</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs sm:text-sm whitespace-nowrap"><Wallet className="mr-1.5 h-4 w-4" />Salaires</TabsTrigger>
          <TabsTrigger value="leaves" className="text-xs sm:text-sm whitespace-nowrap"><CalendarDays className="mr-1.5 h-4 w-4" />Congés</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm whitespace-nowrap"><History className="mr-1.5 h-4 w-4" />Historique</TabsTrigger>
        </TabsList>

        {/* LIST */}
        <TabsContent value="list" className="space-y-4">
          {profile?.is_owner && (
            <div className="flex justify-end">
              <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-4">
                {deletedEmps.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} />
                    <Label htmlFor="show-deleted" className="text-sm cursor-pointer">
                      Voir supprimés ({deletedEmps.length})
                    </Label>
                  </div>
                )}
                <Button onClick={() => setAddOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Ajouter un employé
                </Button>
              </div>
            </div>
          )}

          {showDeleted && deletedEmps.length > 0 && (
            <Card className="border-dashed">
              <CardHeader><CardTitle className="text-base text-muted-foreground">Employés supprimés</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {deletedEmps.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
                    <div>
                      <p className="font-medium">{e.first_name} {e.last_name}</p>
                      <p className="text-xs text-muted-foreground">Historique conservé. Restauration possible.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => restoreEmployee(e.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" />Restaurer
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Photo</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead className="text-right">Salaire</TableHead>
                      <TableHead>Embauche</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e) => {
                      const d = detailFor(e.id);
                      const userRoles = rolesFor(e.id);
                      const jobLabel = d?.job_title || (e.is_owner ? "Propriétaire" : (userRoles[0] ? ROLE_LABELS[userRoles[0]] : "—"));
                      const isActive = d?.is_active ?? true;
                      return (
                        <TableRow key={e.id}>
                          <TableCell>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                              {initials(e)}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {e.first_name} {e.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{jobLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {d?.base_salary ? formatFCFA(Number(d.base_salary)) : (e.hourly_rate ? `${Number(e.hourly_rate).toLocaleString("fr-FR")} / h` : "—")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {d?.hired_at ? format(parseISO(d.hired_at), "dd MMM yyyy", { locale: fr }) : "—"}
                          </TableCell>
                          <TableCell>
                            {e.is_owner ? (
                              <Badge>Propriétaire</Badge>
                            ) : (
                              <Badge variant={isActive ? "default" : "outline"}>
                                {isActive ? "Actif" : "Inactif"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {profile?.is_owner && !e.is_owner ? (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" className="text-primary" onClick={() => openProfile(e)}>
                                  Modifier
                                </Button>
                                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => toggleActive(e.id, isActive)}>
                                  {isActive ? "Désactiver" : "Réactiver"}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer cet employé ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <strong>{e.first_name} {e.last_name}</strong> sera retiré de la liste et perdra immédiatement l'accès à l'application.
                                        <br /><br />
                                        L'historique (commandes prises, pointages, bulletins de paie, factures) est <strong>intégralement conservé</strong> pour la conformité comptable et fiscale.
                                        <br /><br />
                                        Vous pourrez le restaurer à tout moment depuis "Voir supprimés".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteEmployee(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PAYROLL */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
              <div>
                <h3 className="text-lg font-semibold">Gestion complète de la paie</h3>
                <p className="text-sm text-muted-foreground">
                  Périodes mensuelles, génération automatique depuis le pointage, charges sociales (CNSS, IPRES, IRPP), bulletins PDF.
                </p>
              </div>
              <Link to="/app/payroll">
                <Button><Wallet className="mr-2 h-4 w-4" />Ouvrir la paie</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Récapitulatif des salaires</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead className="text-right">Salaire base</TableHead>
                    <TableHead className="text-right">Taux horaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.filter((e) => !e.is_owner).map((e) => {
                    const d = detailFor(e.id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                        <TableCell>{d?.job_title ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{(d?.contract_type ?? "cdi").toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-right">{formatFCFA(Number(d?.base_salary ?? 0))}</TableCell>
                        <TableCell className="text-right">{Number(d?.hourly_rate ?? e.hourly_rate ?? 0).toLocaleString("fr-FR")} / h</TableCell>
                      </TableRow>
                    );
                  })}
                  {employees.filter((e) => !e.is_owner).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aucun employé.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEAVES */}
        <TabsContent value="leaves">
          {restaurant && (
            <LeavesManager restaurantId={restaurant.id} employees={employees.filter((e) => !e.is_owner)} />
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
              <div>
                <h3 className="text-lg font-semibold">Historique des pointages</h3>
                <p className="text-sm text-muted-foreground">
                  Heures travaillées, entrées/sorties par employé.
                </p>
              </div>
              <Link to="/app/timeclock">
                <Button variant="outline"><History className="mr-2 h-4 w-4" />Voir le pointage</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
              <div>
                <h3 className="text-lg font-semibold">Journal d'audit</h3>
                <p className="text-sm text-muted-foreground">
                  Toutes les actions sensibles tracées (création, modification, suppression).
                </p>
              </div>
              <Link to="/app/audit">
                <Button variant="outline"><History className="mr-2 h-4 w-4" />Ouvrir l'audit</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {restaurant && profile && (
        <AddEmployeeDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          restaurantId={restaurant.id}
          invitedBy={profile.id}
          onCreated={load}
        />
      )}

      {profileEmp && restaurant && (
        <EmployeeProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          employeeId={profileEmp.id}
          employeeName={`${profileEmp.first_name ?? ""} ${profileEmp.last_name ?? ""}`.trim() || "Employé"}
          restaurantId={restaurant.id}
          isOwnerCurrentUser={!!profile?.is_owner}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default Staff;
