import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileDown, Mail, BookOpen, Hotel } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { buildSyscohadaCSV, downloadSyscohadaCSV } from "@/lib/accounting/syscohadaExport";
import { fetchPmsRows, rowsToCSV, downloadPmsCSV, markRowsExported, buildMailtoLink, type PmsRow } from "@/lib/pms/hotelExport";

export default function Exports() {
  const { restaurant } = useAuth();
  const today = new Date();
  const [from, setFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [pmsEmail, setPmsEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pmsPreview, setPmsPreview] = useState<PmsRow[] | null>(null);

  const exportFEC = async () => {
    if (!restaurant) return;
    setBusy("fec");
    try {
      const csv = await buildSyscohadaCSV({ restaurantId: restaurant.id, from, to });
      downloadSyscohadaCSV(csv, `FEC_${restaurant.id.slice(0, 8)}_${from}_${to}.csv`);
      toast.success("Export SYSCOHADA généré");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const loadPms = async () => {
    if (!restaurant) return;
    setBusy("pms-load");
    try {
      const rows = await fetchPmsRows({ restaurantId: restaurant.id, from, to });
      setPmsPreview(rows);
      toast.success(`${rows.length} commande(s) chambre`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const downloadPms = async () => {
    if (!restaurant || !pmsPreview) return;
    const csv = rowsToCSV(pmsPreview);
    downloadPmsCSV(csv, `PMS_${from}_${to}.csv`);
    await markRowsExported(pmsPreview.map((r) => r.order_id));
    toast.success("Export PMS téléchargé et marqué exporté");
  };

  const emailPms = () => {
    if (!pmsPreview || !pmsEmail) { toast.error("Email & aperçu requis"); return; }
    window.location.href = buildMailtoLink(pmsEmail, pmsPreview, `${from} → ${to}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Exports comptables & PMS</h1>
        <p className="text-muted-foreground">SYSCOHADA (FEC) et CSV pour systèmes hôteliers</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Période</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="from">Du</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">Au</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="syscohada">
        <TabsList>
          <TabsTrigger value="syscohada"><BookOpen className="h-4 w-4 mr-2" />SYSCOHADA</TabsTrigger>
          <TabsTrigger value="pms"><Hotel className="h-4 w-4 mr-2" />PMS hôtel</TabsTrigger>
        </TabsList>

        <TabsContent value="syscohada">
          <Card>
            <CardHeader><CardTitle>Fichier des Écritures Comptables (FEC)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                CSV (séparateur ;) compatible cabinets comptables OHADA. Inclut journaux ventes, achats, paie.
              </p>
              <Button onClick={exportFEC} disabled={busy === "fec"}>
                {busy === "fec" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                Télécharger FEC
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pms">
          <Card>
            <CardHeader><CardTitle>Export extras chambre (room charge)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exporte les commandes payées en "room_charge" pour intégration Opera, Mews, Cloudbeds…
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={loadPms} disabled={busy === "pms-load"}>
                  {busy === "pms-load" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Charger l'aperçu
                </Button>
                <Button onClick={downloadPms} disabled={!pmsPreview?.length}>
                  <FileDown className="h-4 w-4 mr-2" />Télécharger CSV
                </Button>
              </div>
              {pmsPreview && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    {pmsPreview.length} ligne(s) — total {pmsPreview.reduce((s, r) => s + r.total, 0).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <div className="flex-1">
                  <Label htmlFor="pms-email">Email réception (PMS)</Label>
                  <Input id="pms-email" type="email" placeholder="reception@hotel.com" value={pmsEmail} onChange={(e) => setPmsEmail(e.target.value)} />
                </div>
                <Button variant="outline" onClick={emailPms} disabled={!pmsPreview?.length || !pmsEmail}>
                  <Mail className="h-4 w-4 mr-2" />Préparer email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}