import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFCFA } from "@/lib/currency";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";

interface Entry { id: string; entry_date: string; journal: string; reference: string | null; label: string; account_code: string; debit: number; credit: number; }
interface Account { code: string; label: string; class: number; type: string; }

const Ledger = () => {
  const { restaurant } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const load = async () => {
    if (!restaurant) return;
    const [e, a] = await Promise.all([
      supabase.from("accounting_entries").select("*").eq("restaurant_id", restaurant.id)
        .gte("entry_date", from).lte("entry_date", to).order("entry_date"),
      supabase.from("accounting_accounts").select("code, label, class, type").eq("restaurant_id", restaurant.id).order("code"),
    ]);
    setEntries((e.data ?? []) as Entry[]);
    setAccounts((a.data ?? []) as Account[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant, from, to]);

  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.code, a.label])), [accounts]);

  const balance = useMemo(() => {
    const m = new Map<string, { debit: number; credit: number }>();
    entries.forEach((e) => {
      const cur = m.get(e.account_code) ?? { debit: 0, credit: 0 };
      cur.debit += Number(e.debit);
      cur.credit += Number(e.credit);
      m.set(e.account_code, cur);
    });
    return Array.from(m.entries()).map(([code, v]) => ({ code, label: accountMap[code] ?? code, ...v, solde: v.debit - v.credit }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [entries, accountMap]);

  const totalDebit = entries.reduce((s, e) => s + Number(e.debit), 0);
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0);

  const exportFEC = () => {
    const rows = entries.map((e) => ({
      JournalCode: e.journal,
      EcritureDate: e.entry_date.replace(/-/g, ""),
      CompteNum: e.account_code,
      CompteLib: accountMap[e.account_code] ?? e.account_code,
      PieceRef: e.reference ?? "",
      EcritureLib: e.label,
      Debit: Number(e.debit).toFixed(2).replace(".", ","),
      Credit: Number(e.credit).toFixed(2).replace(".", ","),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FEC");
    XLSX.writeFile(wb, `FEC-SYSCOHADA-${from}-${to}.xlsx`);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Grand livre & Journal</h1>
          <p className="mt-1 text-muted-foreground">Écritures SYSCOHADA générées automatiquement.</p>
        </div>
        <Button variant="outline" onClick={exportFEC}><FileSpreadsheet className="mr-2 h-4 w-4" />Export FEC SYSCOHADA</Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total débit</p><p className="text-2xl font-bold">{formatFCFA(totalDebit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total crédit</p><p className="text-2xl font-bold">{formatFCFA(totalCredit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Équilibre</p><p className={`text-2xl font-bold ${Math.abs(totalDebit - totalCredit) < 1 ? "text-success" : "text-destructive"}`}>{formatFCFA(totalDebit - totalCredit)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="journal">
        <TabsList>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="accounts">Plan comptable</TabsTrigger>
        </TabsList>
        <TabsContent value="journal">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Journal</TableHead><TableHead>Compte</TableHead>
                <TableHead>Libellé</TableHead><TableHead className="text-right">Débit</TableHead><TableHead className="text-right">Crédit</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entries.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune écriture sur la période.</TableCell></TableRow> :
                  entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{format(parseISO(e.entry_date), "d MMM", { locale: fr })}</TableCell>
                      <TableCell><span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{e.journal}</span></TableCell>
                      <TableCell className="font-mono text-xs">{e.account_code} <span className="text-muted-foreground">{accountMap[e.account_code]}</span></TableCell>
                      <TableCell>{e.label}</TableCell>
                      <TableCell className="text-right">{Number(e.debit) > 0 ? formatFCFA(e.debit) : "—"}</TableCell>
                      <TableCell className="text-right">{Number(e.credit) > 0 ? formatFCFA(e.credit) : "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="balance">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Compte</TableHead><TableHead>Libellé</TableHead>
                <TableHead className="text-right">Débit</TableHead><TableHead className="text-right">Crédit</TableHead><TableHead className="text-right">Solde</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {balance.map((b) => (
                  <TableRow key={b.code}>
                    <TableCell className="font-mono">{b.code}</TableCell>
                    <TableCell>{b.label}</TableCell>
                    <TableCell className="text-right">{formatFCFA(b.debit)}</TableCell>
                    <TableCell className="text-right">{formatFCFA(b.credit)}</TableCell>
                    <TableCell className={`text-right font-semibold ${b.solde < 0 ? "text-destructive" : ""}`}>{formatFCFA(b.solde)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="accounts">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Libellé</TableHead><TableHead>Classe</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.code}>
                    <TableCell className="font-mono">{a.code}</TableCell>
                    <TableCell>{a.label}</TableCell>
                    <TableCell>{a.class}</TableCell>
                    <TableCell><span className="text-xs text-muted-foreground capitalize">{a.type}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Ledger;