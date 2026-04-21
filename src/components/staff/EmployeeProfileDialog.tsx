import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Trash2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string;
  employeeName: string;
  restaurantId: string;
  isOwnerCurrentUser: boolean;
  onSaved?: () => void;
}

const CONTRACT_TYPES = [
  { v: "cdi", l: "CDI" },
  { v: "cdd", l: "CDD" },
  { v: "extra", l: "Extra / Vacataire" },
  { v: "stagiaire", l: "Stagiaire" },
];

const ROLE_LABELS: Record<string, string> = {
  manager: "Gérant",
  waiter: "Serveur",
  kitchen: "Cuisine",
  cashier: "Caissier",
};

const DOC_TYPES = [
  { v: "contract", l: "Contrat" },
  { v: "id_card", l: "Pièce d'identité" },
  { v: "diploma", l: "Diplôme" },
  { v: "other", l: "Autre" },
];

const ADJ_TYPES = [
  { v: "bonus", l: "Prime" },
  { v: "advance", l: "Avance sur salaire" },
  { v: "deduction", l: "Déduction" },
];

export function EmployeeProfileDialog({
  open, onOpenChange, employeeId, employeeName, restaurantId, isOwnerCurrentUser, onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [details, setDetails] = useState({
    contract_type: "cdi",
    hired_at: "",
    contract_end_date: "",
    job_title: "",
    base_salary: "0",
    hourly_rate: "0",
    annual_leave_days: "0",
    bank_account: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    is_active: true,
    notes: "",
  });
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("waiter");

  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("contract");

  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [adj, setAdj] = useState({
    period_month: new Date().toISOString().slice(0, 7) + "-01",
    adjustment_type: "bonus",
    amount: "",
    reason: "",
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const [d, r, docs, adj] = await Promise.all([
        supabase.from("employee_details").select("*").eq("user_id", employeeId).eq("restaurant_id", restaurantId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", employeeId).eq("restaurant_id", restaurantId),
        supabase.from("employee_documents").select("*").eq("user_id", employeeId).eq("restaurant_id", restaurantId).order("created_at", { ascending: false }),
        supabase.from("payroll_adjustments").select("*").eq("user_id", employeeId).eq("restaurant_id", restaurantId).order("period_month", { ascending: false }),
      ]);
      if (d.data) {
        setDetailsId(d.data.id);
        setDetails({
          contract_type: d.data.contract_type ?? "cdi",
          hired_at: d.data.hired_at ?? "",
          contract_end_date: d.data.contract_end_date ?? "",
          job_title: d.data.job_title ?? "",
          base_salary: String(d.data.base_salary ?? 0),
          hourly_rate: String(d.data.hourly_rate ?? 0),
          annual_leave_days: String(d.data.annual_leave_days ?? 0),
          bank_account: d.data.bank_account ?? "",
          emergency_contact_name: d.data.emergency_contact_name ?? "",
          emergency_contact_phone: d.data.emergency_contact_phone ?? "",
          is_active: d.data.is_active ?? true,
          notes: d.data.notes ?? "",
        });
      } else {
        setDetailsId(null);
      }
      setRoles((r.data ?? []).map((x: any) => x.role));
      setDocuments(docs.data ?? []);
      setAdjustments(adj.data ?? []);
      setLoading(false);
    })();
  }, [open, employeeId, restaurantId]);

  const saveDetails = async () => {
    setSaving(true);
    const payload = {
      restaurant_id: restaurantId,
      user_id: employeeId,
      contract_type: details.contract_type,
      hired_at: details.hired_at || null,
      contract_end_date: details.contract_end_date || null,
      job_title: details.job_title || null,
      base_salary: parseFloat(details.base_salary) || 0,
      hourly_rate: parseFloat(details.hourly_rate) || 0,
      annual_leave_days: parseInt(details.annual_leave_days) || 0,
      bank_account: details.bank_account || null,
      emergency_contact_name: details.emergency_contact_name || null,
      emergency_contact_phone: details.emergency_contact_phone || null,
      is_active: details.is_active,
      notes: details.notes || null,
    };
    const q = detailsId
      ? supabase.from("employee_details").update(payload).eq("id", detailsId)
      : supabase.from("employee_details").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); setSaving(false); return; }
    // Sync hourly_rate on profile (used by payroll)
    await supabase.from("profiles").update({ hourly_rate: parseFloat(details.hourly_rate) || 0 }).eq("id", employeeId);
    toast.success("Fiche enregistrée");
    setSaving(false);
    onSaved?.();
  };

  const addRole = async () => {
    if (roles.includes(newRole)) { toast.error("Rôle déjà attribué"); return; }
    const { error } = await supabase.from("user_roles").insert({
      user_id: employeeId, restaurant_id: restaurantId, role: newRole as any,
    });
    if (error) { toast.error(error.message); return; }
    setRoles([...roles, newRole]);
    toast.success("Rôle ajouté");
  };

  const removeRole = async (role: string) => {
    const { error } = await supabase.from("user_roles").delete()
      .eq("user_id", employeeId).eq("restaurant_id", restaurantId).eq("role", role as any);
    if (error) { toast.error(error.message); return; }
    setRoles(roles.filter((r) => r !== role));
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${restaurantId}/${employeeId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: ins, error } = await supabase.from("employee_documents").insert({
      restaurant_id: restaurantId, user_id: employeeId, doc_type: docType, name: file.name, file_url: path,
    }).select().single();
    if (error) { toast.error(error.message); setUploading(false); return; }
    setDocuments([ins, ...documents]);
    toast.success("Document ajouté");
    setUploading(false);
  };

  const downloadDoc = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("employee-documents").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Erreur de téléchargement"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const deleteDoc = async (doc: any) => {
    if (!confirm(`Supprimer ${doc.name} ?`)) return;
    await supabase.storage.from("employee-documents").remove([doc.file_url]);
    await supabase.from("employee_documents").delete().eq("id", doc.id);
    setDocuments(documents.filter((d) => d.id !== doc.id));
    toast.success("Document supprimé");
  };

  const addAdjustment = async () => {
    const amt = parseFloat(adj.amount);
    if (isNaN(amt) || amt === 0) { toast.error("Montant invalide"); return; }
    const { data, error } = await supabase.from("payroll_adjustments").insert({
      restaurant_id: restaurantId,
      user_id: employeeId,
      period_month: adj.period_month,
      adjustment_type: adj.adjustment_type,
      amount: amt,
      reason: adj.reason || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setAdjustments([data, ...adjustments]);
    setAdj({ ...adj, amount: "", reason: "" });
    toast.success("Ajustement ajouté");
  };

  const deleteAdjustment = async (id: string) => {
    await supabase.from("payroll_adjustments").delete().eq("id", id);
    setAdjustments(adjustments.filter((a) => a.id !== id));
  };

  const adjustmentLabel = (t: string) => ADJ_TYPES.find((x) => x.v === t)?.l ?? t;
  const docLabel = (t: string) => DOC_TYPES.find((x) => x.v === t)?.l ?? t;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fiche employé — {employeeName}</DialogTitle>
          <DialogDescription>Gérer les informations contractuelles, les documents, les permissions et les ajustements de paie.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="info" className="mt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Infos</TabsTrigger>
              <TabsTrigger value="docs">Documents</TabsTrigger>
              <TabsTrigger value="access">Accès</TabsTrigger>
              <TabsTrigger value="payroll">Paie</TabsTrigger>
            </TabsList>

            {/* INFO */}
            <TabsContent value="info" className="space-y-4 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Type de contrat</Label>
                  <Select value={details.contract_type} onValueChange={(v) => setDetails({ ...details, contract_type: v })} disabled={!isOwnerCurrentUser}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Poste / Fonction</Label>
                  <Input value={details.job_title} onChange={(e) => setDetails({ ...details, job_title: e.target.value })} disabled={!isOwnerCurrentUser} placeholder="Chef de rang, Plongeur..." />
                </div>
                <div>
                  <Label>Date d'embauche</Label>
                  <Input type="date" value={details.hired_at} onChange={(e) => setDetails({ ...details, hired_at: e.target.value })} disabled={!isOwnerCurrentUser} />
                </div>
                <div>
                  <Label>Fin de contrat (CDD)</Label>
                  <Input type="date" value={details.contract_end_date} onChange={(e) => setDetails({ ...details, contract_end_date: e.target.value })} disabled={!isOwnerCurrentUser} />
                </div>
                <div>
                  <Label>Salaire de base (FCFA)</Label>
                  <Input type="number" min="0" value={details.base_salary} onChange={(e) => setDetails({ ...details, base_salary: e.target.value })} disabled={!isOwnerCurrentUser} />
                </div>
                <div>
                  <Label>Taux horaire (FCFA / h)</Label>
                  <Input type="number" min="0" value={details.hourly_rate} onChange={(e) => setDetails({ ...details, hourly_rate: e.target.value })} disabled={!isOwnerCurrentUser} />
                </div>
                <div>
                  <Label>Jours de congés annuels</Label>
                  <Input type="number" min="0" value={details.annual_leave_days} onChange={(e) => setDetails({ ...details, annual_leave_days: e.target.value })} disabled={!isOwnerCurrentUser} />
                </div>
                <div>
                  <Label>Coordonnées bancaires</Label>
                  <Input value={details.bank_account} onChange={(e) => setDetails({ ...details, bank_account: e.target.value })} disabled={!isOwnerCurrentUser} placeholder="IBAN ou n° de compte" />
                </div>
                <div>
                  <Label>Contact d'urgence</Label>
                  <Input value={details.emergency_contact_name} onChange={(e) => setDetails({ ...details, emergency_contact_name: e.target.value })} disabled={!isOwnerCurrentUser} placeholder="Nom" />
                </div>
                <div>
                  <Label>Téléphone d'urgence</Label>
                  <Input value={details.emergency_contact_phone} onChange={(e) => setDetails({ ...details, emergency_contact_phone: e.target.value })} disabled={!isOwnerCurrentUser} placeholder="+221..." />
                </div>
              </div>

              <div>
                <Label>Notes managériales</Label>
                <Textarea value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} disabled={!isOwnerCurrentUser} rows={3} />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">Compte actif</p>
                  <p className="text-xs text-muted-foreground">Désactiver pour suspendre l'accès et exclure de la paie</p>
                </div>
                <Switch checked={details.is_active} onCheckedChange={(v) => setDetails({ ...details, is_active: v })} disabled={!isOwnerCurrentUser} />
              </div>

              {isOwnerCurrentUser && (
                <DialogFooter>
                  <Button onClick={saveDetails} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                </DialogFooter>
              )}
            </TabsContent>

            {/* DOCS */}
            <TabsContent value="docs" className="space-y-4 pt-4">
              {isOwnerCurrentUser && (
                <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                  <div className="flex-1 min-w-[160px]">
                    <Label>Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label>Fichier</Label>
                    <Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={uploading} />
                  </div>
                  {uploading && <Loader2 className="mb-2 h-4 w-4 animate-spin" />}
                </div>
              )}
              {documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun document.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-md border p-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{docLabel(d.doc_type)} · {new Date(d.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => downloadDoc(d.file_url, d.name)}>Voir</Button>
                      {isOwnerCurrentUser && (
                        <Button size="icon" variant="ghost" onClick={() => deleteDoc(d)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ACCESS */}
            <TabsContent value="access" className="space-y-4 pt-4">
              <div>
                <Label className="mb-2 block">Rôles attribués</Label>
                <div className="flex flex-wrap gap-2">
                  {roles.length === 0 && <p className="text-sm text-muted-foreground">Aucun rôle.</p>}
                  {roles.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-2 py-1.5 pl-3 pr-1">
                      {ROLE_LABELS[r] ?? r}
                      {isOwnerCurrentUser && (
                        <button onClick={() => removeRole(r)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20" aria-label="Retirer">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
              {isOwnerCurrentUser && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Ajouter un rôle</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addRole}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                </div>
              )}
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Les rôles déterminent les modules accessibles. Pour réinitialiser le mot de passe, l'employé doit utiliser "mot de passe oublié" sur la page de connexion.
              </div>
            </TabsContent>

            {/* PAYROLL */}
            <TabsContent value="payroll" className="space-y-4 pt-4">
              {isOwnerCurrentUser && (
                <div className="grid gap-2 rounded-md border p-3 md:grid-cols-4">
                  <div>
                    <Label className="text-xs">Mois</Label>
                    <Input type="month" value={adj.period_month.slice(0, 7)} onChange={(e) => setAdj({ ...adj, period_month: e.target.value + "-01" })} />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={adj.adjustment_type} onValueChange={(v) => setAdj({ ...adj, adjustment_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ADJ_TYPES.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Montant</Label>
                    <Input type="number" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} placeholder="FCFA" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addAdjustment} className="w-full"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
                  </div>
                  <div className="md:col-span-4">
                    <Label className="text-xs">Raison (optionnel)</Label>
                    <Input value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} placeholder="Ex: Prime de fin d'année, avance avril..." />
                  </div>
                </div>
              )}
              {adjustments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun ajustement.</p>
              ) : (
                <div className="space-y-2">
                  {adjustments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
                      <Badge variant={a.adjustment_type === "deduction" ? "destructive" : a.adjustment_type === "advance" ? "outline" : "default"}>
                        {adjustmentLabel(a.adjustment_type)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{Number(a.amount).toLocaleString("fr-FR")} FCFA</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.period_month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}{a.reason ? ` · ${a.reason}` : ""}</p>
                      </div>
                      {isOwnerCurrentUser && (
                        <Button size="icon" variant="ghost" onClick={() => deleteAdjustment(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}