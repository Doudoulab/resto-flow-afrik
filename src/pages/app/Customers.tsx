import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Wallet, History, CreditCard, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  credit_limit: number;
  balance: number;
  created_at: string;
}

interface CreditTx {
  id: string;
  customer_id: string;
  type: "charge" | "payment";
  amount: number;
  notes: string | null;
  order_id: string | null;
  created_at: string;
}

const empty = { name: "", phone: "", notes: "", credit_limit: "0" };

const Customers = () => {
  const { restaurant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);

  const [txOpen, setTxOpen] = useState(false);
  const [txCustomer, setTxCustomer] = useState<Customer | null>(null);
  const [txType, setTxType] = useState<"charge" | "payment">("payment");
  const [txAmount, setTxAmount] = useState("");
  const [txNotes, setTxNotes] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<CreditTx[]>([]);

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("name");
    if (error) toast.error(error.message);
    else setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setEditOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone ?? "",
      notes: c.notes ?? "",
      credit_limit: String(c.credit_limit ?? 0),
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!restaurant) return;
    if (!form.name.trim()) { toast.error("Le nom est requis"); return; }
    const payload = {
      restaurant_id: restaurant.id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      credit_limit: parseFloat(form.credit_limit) || 0,
    };
    const res = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Client mis à jour" : "Client créé");
    setEditOpen(false);
    load();
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Supprimer ${c.name} et tout son historique ?`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Client supprimé");
    load();
  };

  const openTx = (c: Customer, type: "charge" | "payment") => {
    setTxCustomer(c);
    setTxType(type);
    setTxAmount("");
    setTxNotes("");
    setTxOpen(true);
  };

  const submitTx = async () => {
    if (!txCustomer || !restaurant) return;
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) { toast.error("Montant invalide"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("customer_credit_transactions").insert({
      restaurant_id: restaurant.id,
      customer_id: txCustomer.id,
      type: txType,
      amount: amt,
      notes: txNotes.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(txType === "charge" ? "Ardoise mise à jour" : "Paiement enregistré");
    setTxOpen(false);
    load();
  };

  const openHistory = async (c: Customer) => {
    setHistoryCustomer(c);
    setHistoryOpen(true);
    const { data, error } = await supabase
      .from("customer_credit_transactions")
      .select("*")
      .eq("customer_id", c.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setHistory((data ?? []) as CreditTx[]);
  };

  const deleteTx = async (id: string) => {
    if (!confirm("Annuler cette opération ?")) return;
    const { error } = await supabase.from("customer_credit_transactions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Opération annulée");
    if (historyCustomer) openHistory(historyCustomer);
    load();
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q);
  });

  const totalDebt = customers.reduce((s, c) => s + Math.max(0, Number(c.balance)), 0);
  const overLimit = customers.filter((c) => c.credit_limit > 0 && c.balance > c.credit_limit).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients & Ardoises</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les crédits de vos clients réguliers
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nouveau client</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Clients</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{customers.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total à recouvrer</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-orange-600">{formatFCFA(totalDebt)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Hors plafond</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{overLimit}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Input placeholder="Rechercher par nom ou téléphone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">Aucun client.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead className="text-right">Solde dû</TableHead>
                    <TableHead className="text-right">Plafond</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const debt = Number(c.balance);
                    const limit = Number(c.credit_limit);
                    const over = limit > 0 && debt > limit;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.phone ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <span className={debt > 0 ? "font-semibold text-orange-600" : "text-muted-foreground"}>
                            {formatFCFA(debt)}
                          </span>
                          {over && <Badge variant="destructive" className="ml-2">Dépassé</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {limit > 0 ? formatFCFA(limit) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openTx(c, "charge")} title="Ajouter à l'ardoise">
                              <Receipt className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openTx(c, "payment")} title="Encaisser un paiement">
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openHistory(c)} title="Historique">
                              <History className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Modifier">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(c)} title="Supprimer">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Plafond de crédit (FCFA)</Label><Input type="number" min="0" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction dialog */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {txType === "charge" ? "Ajouter à l'ardoise" : "Encaisser un paiement"} — {txCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Solde actuel</span><span className="font-semibold">{formatFCFA(txCustomer?.balance ?? 0)}</span></div>
              {txCustomer?.credit_limit ? (
                <div className="flex justify-between"><span className="text-muted-foreground">Plafond</span><span>{formatFCFA(txCustomer.credit_limit)}</span></div>
              ) : null}
            </div>
            <div>
              <Label>Type</Label>
              <Select value={txType} onValueChange={(v) => setTxType(v as "charge" | "payment")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="charge">Ajout à l'ardoise (consommation)</SelectItem>
                  <SelectItem value="payment">Paiement reçu (remboursement)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Montant (FCFA) *</Label><Input type="number" min="1" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} autoFocus /></div>
            <div><Label>Note</Label><Input value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Optionnel" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTxOpen(false)}>Annuler</Button>
            <Button onClick={submitTx}>
              <Wallet className="mr-2 h-4 w-4" />
              {txType === "charge" ? "Ajouter" : "Encaisser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Historique — {historyCustomer?.name}</DialogTitle></DialogHeader>
          {history.length === 0 ? (
            <p className="text-muted-foreground">Aucune opération.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{new Date(tx.created_at).toLocaleString("fr-FR")}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === "charge" ? "outline" : "default"}>
                          {tx.type === "charge" ? "Ardoise +" : "Paiement −"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === "charge" ? "text-orange-600" : "text-green-600"}`}>
                        {tx.type === "charge" ? "+" : "−"}{formatFCFA(tx.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.notes ?? "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => deleteTx(tx.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;