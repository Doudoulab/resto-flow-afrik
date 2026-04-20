import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatFCFA } from "@/lib/currency";
import { Loader2, Plus, Download, TrendingUp, TrendingDown, Wallet, Trash2, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, startOfWeek, startOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { exportAccountingPDF, exportAccountingExcel } from "@/lib/exports";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { enqueue } from "@/lib/offline/db";

interface Order { id: string; total: number; created_at: string; status: string; }
interface Expense { id: string; category: string; description: string; amount: number; expense_date: string; }

type Period = "day" | "week" | "month";

const Accounting = () => {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("day");
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    category: "général",
    description: "",
    amount: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
  });

  const load = async () => {
    if (!restaurant) return;
    const [oRes, eRes] = await Promise.all([
      supabase.from("orders").select("id, total, created_at, status").eq("restaurant_id", restaurant.id).eq("status", "paid"),
      supabase.from("expenses").select("*").eq("restaurant_id", restaurant.id).order("expense_date", { ascending: false }),
    ]);
    setOrders((oRes.data ?? []) as Order[]);
    setExpenses((eRes.data ?? []) as Expense[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant]);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "day") return startOfDay(now);
    if (period === "week") return startOfWeek(now, { weekStartsOn: 1 });
    return startOfMonth(now);
  }, [period]);

  const periodOrders = orders.filter((o) => parseISO(o.created_at) >= periodStart);
  const periodExpenses = expenses.filter((e) => parseISO(e.expense_date) >= periodStart);

  const revenue = periodOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const margin = revenue - totalExpenses;
  const avgTicket = periodOrders.length > 0 ? revenue / periodOrders.length : 0;

  const handleCreateExpense = async () => {
    if (!restaurant) return;
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Description et montant valides requis");
      return;
    }
    if (!navigator.onLine) {
      await enqueue({
        kind: "expense_create",
        payload: {
          restaurant_id: restaurant.id,
          category: form.category,
          description: form.description.trim(),
          amount,
          expense_date: form.expense_date,
        },
      });
      toast.success("Dépense enregistrée hors-ligne, synchro au retour");
      setOpen(false);
      setForm({ ...form, description: "", amount: "" });
      return;
    }
    const { error } = await supabase.from("expenses").insert({
      restaurant_id: restaurant.id,
      category: form.category,
      description: form.description.trim(),
      amount,
      expense_date: form.expense_date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Dépense ajoutée");
    setOpen(false);
    setForm({ ...form, description: "", amount: "" });
    load();
  };

  const removeExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const exportCSV = () => {
    const rows: string[] = ["Type,Date,Description,Catégorie,Montant"];
    periodOrders.forEach((o) => {
      rows.push(`Recette,${format(parseISO(o.created_at), "yyyy-MM-dd")},Commande #${o.id.slice(0, 8)},ventes,${o.total}`);
    });
    periodExpenses.forEach((e) => {
      rows.push(`Dépense,${e.expense_date},"${e.description.replace(/"/g, "''")}",${e.category},-${e.amount}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comptabilite-${period}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildExportRows = () => {
    const rows = [
      ...periodOrders.map((o) => ({
        type: "Recette" as const,
        date: format(parseISO(o.created_at), "yyyy-MM-dd"),
        description: `Commande #${o.id.slice(0, 8)}`,
        category: "ventes",
        amount: Number(o.total),
      })),
      ...periodExpenses.map((e) => ({
        type: "Dépense" as const,
        date: e.expense_date,
        description: e.description,
        category: e.category,
        amount: Number(e.amount),
      })),
    ];
    const periodLabel = period === "day" ? "jour" : period === "week" ? "semaine" : "mois";
    return {
      restaurantName: restaurant?.name || "Restaurant",
      periodLabel: `${periodLabel}-${format(new Date(), "yyyy-MM-dd")}`,
      rows,
      revenue,
      expenses: totalExpenses,
      margin,
    };
  };

  const exportPDF = () => exportAccountingPDF(buildExportRows());
  const exportExcel = () => exportAccountingExcel(buildExportRows());

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Comptabilité</h1>
          <p className="mt-1 text-muted-foreground">Recettes, dépenses et marge de {restaurant?.name}.</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exporter</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPDF}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}><FileText className="mr-2 h-4 w-4" /> CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Dépense</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Description *</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Achat poisson, électricité..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Montant (FCFA) *</Label>
                    <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="général, achats, salaires..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={handleCreateExpense}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { k: "day" as const, l: "Jour" },
          { k: "week" as const, l: "Semaine" },
          { k: "month" as const, l: "Mois" },
        ].map((p) => (
          <Button key={p.k} size="sm" variant={period === p.k ? "default" : "outline"} onClick={() => setPeriod(p.k)}>
            {p.l}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recettes</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatFCFA(revenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dépenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatFCFA(totalExpenses)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Marge</CardTitle>
            <Wallet className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${margin >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatFCFA(margin)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Panier moyen</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatFCFA(avgTicket)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{periodOrders.length} commandes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Dépenses récentes</CardTitle></CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aucune dépense enregistrée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 20).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{format(parseISO(e.expense_date), "d MMM", { locale: fr })}</TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell className="text-muted-foreground">{e.category}</TableCell>
                    <TableCell className="text-right font-semibold">{formatFCFA(e.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeExpense(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Accounting;
