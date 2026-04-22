import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pause, Play, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export default function Restaurants() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-restaurants", search],
    queryFn: async () => {
      let q = supabase.from("restaurants").select("id, name, slug, owner_id, country_code, currency, suspended_at, suspended_reason, created_at").order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });

  const suspend = async (id: string) => {
    const { error } = await supabase.rpc("admin_suspend_restaurant", { _restaurant_id: id, _reason: reason || "non spécifié" });
    if (error) toast.error(error.message); else { toast.success("Restaurant suspendu"); qc.invalidateQueries({ queryKey: ["admin-restaurants"] }); }
    setReason("");
  };
  const unsuspend = async (id: string) => {
    const { error } = await supabase.rpc("admin_unsuspend_restaurant", { _restaurant_id: id });
    if (error) toast.error(error.message); else { toast.success("Restaurant réactivé"); qc.invalidateQueries({ queryKey: ["admin-restaurants"] }); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.rpc("admin_delete_restaurant", { _restaurant_id: id });
    if (error) toast.error(error.message); else { toast.success("Restaurant supprimé"); qc.invalidateQueries({ queryKey: ["admin-restaurants"] }); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Restaurants</h1>
        <p className="text-muted-foreground mt-1">Gestion des restaurants inscrits sur la plateforme</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscrit le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>}
            {!isLoading && data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun restaurant</TableCell></TableRow>}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">/{r.slug}</div>
                </TableCell>
                <TableCell>{r.country_code} · {r.currency}</TableCell>
                <TableCell>
                  {r.suspended_at ? (
                    <Badge variant="destructive">Suspendu</Badge>
                  ) : (
                    <Badge variant="secondary">Actif</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="text-right space-x-2">
                  {r.suspended_at ? (
                    <Button size="sm" variant="outline" onClick={() => unsuspend(r.id)}>
                      <Play className="h-3 w-3 mr-1" /> Réactiver
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline"><Pause className="h-3 w-3 mr-1" /> Suspendre</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Suspendre {r.name} ?</AlertDialogTitle>
                          <AlertDialogDescription>Le resto perdra accès à l'app. Les données sont conservées.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input placeholder="Raison (optionnel)" value={reason} onChange={(e) => setReason(e.target.value)} />
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => suspend(r.id)}>Suspendre</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer {r.name} ?</AlertDialogTitle>
                        <AlertDialogDescription>⚠️ Action irréversible. Toutes les données seront définitivement perdues.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(r.id)} className="bg-destructive">Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}