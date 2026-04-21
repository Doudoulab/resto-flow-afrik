import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Printer, Plus, TestTube2, Trash2, DoorOpen } from "lucide-react";
import { print, openCashDrawer, type PrinterConfig } from "@/lib/printing/transports";
import { buildKitchenTicket } from "@/lib/printing/escpos";

export default function Printers() {
  const { restaurant } = useAuth();
  const [printers, setPrinters] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", printer_type: "kitchen", connection_mode: "agent",
    address: "", paper_width: 48, open_drawer: false, station_id: null,
  });

  const load = async () => {
    if (!restaurant) return;
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("printers").select("*").eq("restaurant_id", restaurant.id).order("created_at"),
      supabase.from("kitchen_stations").select("id,name").eq("restaurant_id", restaurant.id),
    ]);
    setPrinters(p || []); setStations(s || []);
  };
  useEffect(() => { load(); }, [restaurant?.id]);

  const save = async () => {
    if (!restaurant) return;
    const payload = { ...form, restaurant_id: restaurant.id, station_id: form.station_id || null };
    const { error } = await supabase.from("printers").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Imprimante ajoutée");
    setOpen(false);
    setForm({ name: "", printer_type: "kitchen", connection_mode: "agent", address: "", paper_width: 48, open_drawer: false, station_id: null });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("printers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimée"); load();
  };

  const test = async (p: any) => {
    try {
      const data = buildKitchenTicket({
        restaurantName: restaurant?.name || "RestoFlow",
        orderNumber: "TEST",
        station: p.printer_type.toUpperCase(),
        items: [{ qty: 1, name: "Test impression OK" }],
        width: p.paper_width === 80 ? 48 : 32,
      });
      await print(p as PrinterConfig, data);
      toast.success("Ticket envoyé");
    } catch (e: any) {
      toast.error(`Échec: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Printer className="h-7 w-7" /> Imprimantes</h1>
          <p className="text-muted-foreground">ESC/POS via WebUSB, Bluetooth ou agent local. Tiroir-caisse compatible.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead>Connexion</TableHead>
              <TableHead>Adresse</TableHead><TableHead>Tiroir</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {printers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.printer_type}</Badge></TableCell>
                  <TableCell>{p.connection_mode}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.address || "—"}</TableCell>
                  <TableCell>{p.open_drawer ? "✓" : "—"}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => test(p)}><TestTube2 className="h-4 w-4" /></Button>
                    {p.open_drawer && <Button size="sm" variant="outline" onClick={() => openCashDrawer(p)}><DoorOpen className="h-4 w-4" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {printers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucune imprimante configurée</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent local (recommandé pour Windows/Mac)</CardTitle>
          <CardDescription>
            Pour brancher n'importe quelle imprimante ESC/POS et tiroir-caisse, installez un petit service local
            qui expose <code>POST http://localhost:9100/print</code>. Compatible avec PrintNode, Webprint, ou un script Node.js maison.
            <br />WebUSB/Bluetooth fonctionnent directement sur Chrome/Edge en HTTPS sans installation.
          </CardDescription>
        </CardHeader>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle imprimante</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cuisine principale" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.printer_type} onValueChange={(v) => setForm({ ...form, printer_type: v })}>
                <SelectTrigger /><SelectContent>
                  <SelectItem value="kitchen">Cuisine</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="cashier">Caisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Connexion</Label>
              <Select value={form.connection_mode} onValueChange={(v) => setForm({ ...form, connection_mode: v })}>
                <SelectTrigger /><SelectContent>
                  <SelectItem value="agent">Agent local (HTTP)</SelectItem>
                  <SelectItem value="usb">WebUSB</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.connection_mode === "agent" && (
              <div><Label>URL agent</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="http://localhost:9100" /></div>
            )}
            <div>
              <Label>Largeur papier</Label>
              <Select value={String(form.paper_width)} onValueChange={(v) => setForm({ ...form, paper_width: Number(v) })}>
                <SelectTrigger /><SelectContent>
                  <SelectItem value="48">58mm (32 col)</SelectItem>
                  <SelectItem value="80">80mm (48 col)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.printer_type === "cashier" && (
              <div className="flex items-center justify-between">
                <Label>Tiroir-caisse connecté</Label>
                <Switch checked={form.open_drawer} onCheckedChange={(v) => setForm({ ...form, open_drawer: v })} />
              </div>
            )}
            {stations.length > 0 && form.printer_type !== "cashier" && (
              <div>
                <Label>Station de cuisine (optionnel)</Label>
                <Select value={form.station_id || "none"} onValueChange={(v) => setForm({ ...form, station_id: v === "none" ? null : v })}>
                  <SelectTrigger /><SelectContent>
                    <SelectItem value="none">Toutes</SelectItem>
                    {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}