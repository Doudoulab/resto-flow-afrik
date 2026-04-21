import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import { Loader2, Plus, FileDown, RefreshCw, CheckCircle2 } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Decl { id: string; period_month: string; vat_collected: number; vat_deductible: number; vat_to_pay: number; status: string; declared_at: string | null; }

const TaxReturns = () => {
  const { restaurant } = useAuth();
  const [items, setItems] = useState<Decl[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase.from("tax_declarations").select("*").eq("restaurant_id", restaurant.id).order("period_month", { ascending: false });
    setItems((data ?? []) as Decl[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant]);

  const computeForMonth = async (month: string) => {
    if (!restaurant) return { collected: 0, deductible: 0 };
    const start = startOfMonth(parseISO(month));
    const end = endOfMonth(start);
    const { data: invs } = await supabase.from("invoices").select("tax_amount").eq("restaurant_id", restaurant.id)
      .gte("issued_at", start.toISOString()).lte("issued_at", end.toISOString());
    const collected = (invs ?? []).reduce((s: number, i: any) => s + Number(i.tax_amount ?? 0), 0);
    const deductible = collected * 0.15;
    return { collected, deductible };
  };

  const create = async () => {
    if (!restaurant) return;
    const { collected, deductible } = await computeForMonth(newMonth);
    const { error } = await supabase.from("tax_declarations").insert({
      restaurant_id: restaurant.id, period_month: newMonth,
      vat_collected: collected, vat_deductible: deductible, vat_to_pay: collected - deductible,
    });
    if (error) return toast.error(error.message);
    toast.success("Déclaration créée");
    setOpen(false);
    load();
  };

  const recalc = async (d: Decl) => {
    const { collected, deductible } = await computeForMonth(d.period_month);
    const { error } = await supabase.from("tax_declarations").update({
      vat_collected: collected, vat_deductible: deductible, vat_to_pay: collected - deductible,
    }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Recalculé");
    load();
  };

  const declare = async (d: Decl) => {
    if (!confirm("Marquer cette déclaration comme déclarée ?")) return;
    const { error } = await supabase.from("tax_declarations").update({ status: "declared", declared_at: new Date().toISOString() }).eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  const exportPDF = (d: Decl) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Déclaration de TVA", 14, 18);
    doc.setFontSize(10);
    doc.text(`${restaurant?.name ?? ""}`, 14, 26);
    doc.text(`Période : ${format(parseISO(d.period_month), "MMMM yyyy", { locale: fr })}`, 14, 32);
    autoTable(doc, {
      startY: 40,
      head: [["Rubrique", "Montant"]],
      body: [
        ["TVA collectée sur ventes", formatFCFA(d.vat_collected)],
        ["TVA déductible sur achats", formatFCFA(d.vat_deductible)],
        ["TVA nette à payer", formatFCFA(d.vat_to_pay)],
      ],
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`tva-${d.period_month}.pdf`);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Déclarations TVA</h1>
          <p className="mt-1 text-muted-foreground">Calcul automatique mensuel depuis les factures émises.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle déclaration</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aucune déclaration. Créez-en une pour commencer.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>TVA collectée</TableHead>
                  <TableHead>TVA déductible</TableHead>
                  <TableHead>À payer</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{format(parseISO(d.period_month), "MMMM yyyy", { locale: fr })}</TableCell>
                    <TableCell>{formatFCFA(d.vat_collected)}</TableCell>
                    <TableCell>{formatFCFA(d.vat_deductible)}</TableCell>
                    <TableCell className="font-semibold">{formatFCFA(d.vat_to_pay)}</TableCell>
                    <TableCell><Badge variant={d.status === "declared" ? "default" : "outline"}>{d.status}</Badge></TableCell>
                    <TableCell className="space-x-1">
                      {d.status === "draft" && <>
                        <Button variant="ghost" size="sm" onClick={() => recalc(d)}><RefreshCw className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => declare(d)}><CheckCircle2 className="h-4 w-4" /></Button>
                      </>}
                      <Button variant="ghost" size="sm" onClick={() => exportPDF(d)}><FileDown className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle déclaration TVA</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Mois</Label>
            <Input type="month" value={newMonth.slice(0, 7)} onChange={(e) => setNewMonth(`${e.target.value}-01`)} />
          </div>
          <DialogFooter><Button onClick={create}>Créer et calculer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaxReturns;