import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Admins() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-admins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_admins").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = async () => {
    const { error } = await supabase.from("platform_admins").insert({ user_id: userId, email, notes: notes || null, created_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Super-admin ajouté");
    setOpen(false); setUserId(""); setEmail(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["platform-admins"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("platform_admins").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Super-admin retiré");
    qc.invalidateQueries({ queryKey: ["platform-admins"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Super-admins</h1>
          <p className="text-muted-foreground mt-1">Personnes ayant accès à ce panel</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un super-admin</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>User ID (uuid)</Label><Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid de l'utilisateur" /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" /></div>
              <div><Label>Notes (optionnel)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <p className="text-xs text-muted-foreground">💡 Tu peux trouver le User ID dans Lovable Cloud → Users.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={add} disabled={!userId || !email}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Ajouté le</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>}
            {!isLoading && data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun super-admin</TableCell></TableRow>}
            {data?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.email}</TableCell>
                <TableCell className="font-mono text-xs">{a.user_id.slice(0, 8)}...</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.notes || "—"}</TableCell>
                <TableCell className="text-sm">{new Date(a.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" disabled={a.user_id === user?.id}><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Retirer ce super-admin ?</AlertDialogTitle>
                        <AlertDialogDescription>{a.email} perdra l'accès au panel /admin.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(a.id)}>Retirer</AlertDialogAction>
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