import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, Trash2, Webhook, Code2 } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const API_BASE = `${SUPABASE_URL}/functions/v1/public-api`;

export default function ApiKeysPage() {
  const { restaurant } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [revealed, setRevealed] = useState<{ key: string; prefix: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [hookUrl, setHookUrl] = useState("");

  const load = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    const [k, w] = await Promise.all([
      supabase.from("api_keys").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
      supabase.from("api_webhooks").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
    ]);
    setKeys((k.data as ApiKey[]) ?? []);
    setHooks((w.data as WebhookRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [restaurant?.id]);

  const createKey = async () => {
    if (!restaurant?.id || !newName.trim()) return;
    const { data, error } = await supabase.rpc("create_api_key", {
      _restaurant_id: restaurant.id,
      _name: newName.trim(),
      _expires_days: null,
    });
    if (error) { toast.error(error.message); return; }
    const res = data as { success: boolean; key?: string; prefix?: string; error?: string };
    if (!res.success) {
      toast.error(res.error === "business_plan_required" ? "Plan Business requis" : res.error ?? "Erreur");
      return;
    }
    setRevealed({ key: res.key!, prefix: res.prefix! });
    setNewName("");
    setCreateOpen(false);
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Révoquer cette clé ? Les intégrations utilisant cette clé cesseront de fonctionner.")) return;
    const { error } = await supabase.rpc("revoke_api_key", { _key_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Clé révoquée");
    load();
  };

  const addWebhook = async () => {
    if (!restaurant?.id || !hookUrl.trim()) return;
    try { new URL(hookUrl); } catch { toast.error("URL invalide"); return; }
    const secret = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("api_webhooks").insert({
      restaurant_id: restaurant.id,
      url: hookUrl.trim(),
      events: ["order.paid"],
      secret,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Webhook ajouté");
    setHookUrl("");
    load();
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm("Supprimer ce webhook ?")) return;
    await supabase.from("api_webhooks").delete().eq("id", id);
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API & Webhooks</h1>
        <p className="text-muted-foreground">Intégrez RestoFlow à vos outils via une API REST en lecture seule.</p>
      </div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys"><KeyRound className="h-4 w-4 mr-2" />Clés API</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-4 w-4 mr-2" />Webhooks</TabsTrigger>
          <TabsTrigger value="docs"><Code2 className="h-4 w-4 mr-2" />Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vos clés API</CardTitle>
                <CardDescription>Lecture seule — accès aux commandes, menu et statistiques.</CardDescription>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Nouvelle clé</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une clé API</DialogTitle>
                    <DialogDescription>Donnez un nom descriptif pour identifier l'usage de cette clé.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Nom de la clé</Label>
                    <Input id="key-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex: Tableau de bord interne" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                    <Button onClick={createKey} disabled={!newName.trim()}>Créer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune clé créée.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Clé</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Dernière utilisation</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell><code className="text-xs">{k.key_prefix}…</code></TableCell>
                        <TableCell>
                          {k.revoked_at ? <Badge variant="destructive">Révoquée</Badge>
                            : k.expires_at && new Date(k.expires_at) < new Date() ? <Badge variant="secondary">Expirée</Badge>
                            : <Badge>Active</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Jamais"}
                        </TableCell>
                        <TableCell>
                          {!k.revoked_at && (
                            <Button variant="ghost" size="icon" onClick={() => revoke(k.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={!!revealed} onOpenChange={() => setRevealed(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Votre nouvelle clé API</DialogTitle>
                <DialogDescription>
                  ⚠️ Copiez-la maintenant — elle ne sera plus jamais affichée.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border bg-muted p-3 font-mono text-sm break-all">
                {revealed?.key}
              </div>
              <DialogFooter>
                <Button onClick={() => { copy(revealed!.key); }}>
                  <Copy className="h-4 w-4 mr-2" />Copier
                </Button>
                <Button variant="outline" onClick={() => setRevealed(null)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks sortants</CardTitle>
              <CardDescription>Recevez des notifications HTTP à chaque évènement (commande payée).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://votre-endpoint.com/webhook" />
                <Button onClick={addWebhook} disabled={!hookUrl.trim()}>
                  <Plus className="h-4 w-4 mr-2" />Ajouter
                </Button>
              </div>
              {hooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun webhook configuré.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Évènements</TableHead>
                      <TableHead>Échecs</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hooks.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="max-w-xs truncate font-mono text-xs">{h.url}</TableCell>
                        <TableCell>{h.events.map((e) => <Badge key={e} variant="outline" className="mr-1">{e}</Badge>)}</TableCell>
                        <TableCell>{h.failure_count}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteWebhook(h.id)}>
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
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentation API</CardTitle>
              <CardDescription>API REST en lecture seule. Authentification via header <code>Authorization: Bearer &lt;clé&gt;</code>.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div>
                <p className="font-semibold mb-1">URL de base</p>
                <code className="block rounded bg-muted p-2 break-all">{API_BASE}</code>
              </div>

              <div>
                <p className="font-semibold mb-1">GET /orders</p>
                <p className="text-muted-foreground mb-2">Liste les commandes (paramètres : <code>limit</code> max 200, <code>since</code> ISO date)</p>
                <pre className="rounded bg-muted p-2 overflow-x-auto text-xs">{`curl -H "Authorization: Bearer rfk_..." \\
  "${API_BASE}/orders?limit=50"`}</pre>
              </div>

              <div>
                <p className="font-semibold mb-1">GET /menu</p>
                <p className="text-muted-foreground mb-2">Retourne catégories + articles du menu</p>
                <pre className="rounded bg-muted p-2 overflow-x-auto text-xs">{`curl -H "Authorization: Bearer rfk_..." \\
  "${API_BASE}/menu"`}</pre>
              </div>

              <div>
                <p className="font-semibold mb-1">GET /stats</p>
                <p className="text-muted-foreground mb-2">Statistiques agrégées sur la période (paramètres : <code>from</code>, <code>to</code> ISO dates)</p>
                <pre className="rounded bg-muted p-2 overflow-x-auto text-xs">{`curl -H "Authorization: Bearer rfk_..." \\
  "${API_BASE}/stats?from=2026-01-01&to=2026-04-30"`}</pre>
              </div>

              <div>
                <p className="font-semibold mb-1">Limites</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>Lecture seule (aucune écriture autorisée)</li>
                  <li>Données limitées au restaurant associé à la clé</li>
                  <li>Plan Business requis</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}