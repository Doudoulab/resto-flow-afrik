import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, UserPlus2 } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { v: "manager", l: "Gérant" },
  { v: "waiter", l: "Serveur" },
  { v: "kitchen", l: "Cuisine" },
  { v: "cashier", l: "Caissier" },
];

const CONTRACTS = [
  { v: "cdi", l: "CDI" },
  { v: "cdd", l: "CDD" },
  { v: "extra", l: "Extra / Vacataire" },
  { v: "stagiaire", l: "Stagiaire" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restaurantId: string;
  invitedBy: string;
  onCreated?: () => void;
}

export function AddEmployeeDialog({ open, onOpenChange, restaurantId, invitedBy, onCreated }: Props) {
  const [tab, setTab] = useState<"invite" | "direct">("invite");

  // Invite
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState("waiter");
  const [invBusy, setInvBusy] = useState(false);

  // Direct
  const [d, setD] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "waiter",
    job_title: "",
    contract_type: "cdi",
    base_salary: "",
    hourly_rate: "",
    pin: "",
  });
  const [dBusy, setDBusy] = useState(false);

  const reset = () => {
    setInvEmail(""); setInvRole("waiter");
    setD({ first_name: "", last_name: "", email: "", password: "", role: "waiter", job_title: "", contract_type: "cdi", base_salary: "", hourly_rate: "", pin: "" });
  };

  const sendInvite = async () => {
    if (!invEmail.includes("@")) { toast.error("Email invalide"); return; }
    setInvBusy(true);
    const { error } = await supabase.from("employee_invitations").insert({
      restaurant_id: restaurantId,
      email: invEmail.trim().toLowerCase(),
      role: invRole as any,
      invited_by: invitedBy,
    });
    setInvBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invitation créée — partagez le lien avec votre employé");
    reset();
    onCreated?.();
    onOpenChange(false);
  };

  const createDirect = async () => {
    if (!d.email.includes("@")) { toast.error("Email invalide"); return; }
    if (d.password.length < 6) { toast.error("Mot de passe : 6 caractères minimum"); return; }
    if (d.pin && !/^[0-9]{4,6}$/.test(d.pin)) { toast.error("PIN : 4 à 6 chiffres"); return; }
    setDBusy(true);
    const { data, error } = await supabase.functions.invoke("create-employee-account", {
      body: {
        email: d.email.trim().toLowerCase(),
        password: d.password,
        first_name: d.first_name.trim() || undefined,
        last_name: d.last_name.trim() || undefined,
        role: d.role,
        job_title: d.job_title.trim() || undefined,
        contract_type: d.contract_type,
        base_salary: parseFloat(d.base_salary) || 0,
        hourly_rate: parseFloat(d.hourly_rate) || 0,
        pin: d.pin || undefined,
      },
    });
    setDBusy(false);
    if (error || (data as any)?.error) {
      // Try to extract the real server error from the response body
      let detail = (data as any)?.error || error?.message || "Erreur de création";
      const ctx: any = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        try { const body = await ctx.json(); detail = body?.error || detail; } catch { /* ignore */ }
      }
      toast.error(detail);
      return;
    }
    toast.success("Employé créé — il peut se connecter avec son email et mot de passe");
    reset();
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Ajouter un employé</DialogTitle>
          <DialogDescription>Choisissez la méthode d'ajout.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="invite" className="text-xs sm:text-sm py-2"><Mail className="mr-1.5 h-4 w-4" />Invitation</TabsTrigger>
            <TabsTrigger value="direct" className="text-xs sm:text-sm py-2"><UserPlus2 className="mr-1.5 h-4 w-4" />Création directe</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Un lien unique sera généré. L'employé clique, crée son compte et choisit son mot de passe.
            </p>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="employe@email.com" />
            </div>
            <div>
              <Label>Rôle *</Label>
              <Select value={invRole} onValueChange={setInvRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button className="w-full sm:w-auto" onClick={sendInvite} disabled={invBusy}>
                {invBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le lien
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="direct" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Vous définissez vous-même l'email et le mot de passe — utile si l'employé n'a pas d'adresse mail personnelle.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Prénom</Label>
                <Input value={d.first_name} onChange={(e) => setD({ ...d, first_name: e.target.value })} />
              </div>
              <div>
                <Label>Nom</Label>
                <Input value={d.last_name} onChange={(e) => setD({ ...d, last_name: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
              </div>
              <div>
                <Label>Mot de passe *</Label>
                <Input type="text" value={d.password} onChange={(e) => setD({ ...d, password: e.target.value })} placeholder="6 caractères min." />
              </div>
              <div>
                <Label>Rôle *</Label>
                <Select value={d.role} onValueChange={(v) => setD({ ...d, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de contrat</Label>
                <Select value={d.contract_type} onValueChange={(v) => setD({ ...d, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACTS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Poste</Label>
                <Input value={d.job_title} onChange={(e) => setD({ ...d, job_title: e.target.value })} placeholder="Serveur, Caissier..." />
              </div>
              <div>
                <Label>Salaire mensuel (FCFA)</Label>
                <Input type="number" min="0" value={d.base_salary} onChange={(e) => setD({ ...d, base_salary: e.target.value })} />
              </div>
              <div>
                <Label>Taux horaire (FCFA / h)</Label>
                <Input type="number" min="0" value={d.hourly_rate} onChange={(e) => setD({ ...d, hourly_rate: e.target.value })} />
              </div>
              <div>
                <Label>PIN pointage (4-6 chiffres)</Label>
                <Input type="text" inputMode="numeric" maxLength={6} value={d.pin} onChange={(e) => setD({ ...d, pin: e.target.value.replace(/\D/g, "") })} placeholder="optionnel" />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button className="w-full sm:w-auto" onClick={createDirect} disabled={dBusy}>
                {dBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le compte
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}