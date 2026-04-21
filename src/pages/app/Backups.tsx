import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download, HardDriveDownload, Database } from "lucide-react";
import { buildBackupZip, uploadBackup } from "@/lib/backup/exporter";

export default function Backups() {
  const { restaurant, user } = useAuth();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase.from("backup_jobs").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }).limit(20);
    setJobs(data || []);
  };

  useEffect(() => { load(); }, [restaurant?.id]);

  const runBackup = async () => {
    if (!restaurant || !user) return;
    setRunning(true); setProgress(0); setProgressMsg("Démarrage…");
    const { data: job } = await supabase.from("backup_jobs").insert({
      restaurant_id: restaurant.id, created_by: user.id,
      status: "running", started_at: new Date().toISOString(),
    }).select().single();
    try {
      const { blob, tables, totalRows } = await buildBackupZip(restaurant.id, (m, p) => { setProgressMsg(m); setProgress(p); });
      const path = await uploadBackup(restaurant.id, blob);
      await supabase.from("backup_jobs").update({
        status: "completed", file_path: path, file_size: blob.size,
        tables_included: tables, completed_at: new Date().toISOString(),
      }).eq("id", job!.id);
      // Local download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `backup-${restaurant.name}-${new Date().toISOString().slice(0,10)}.zip`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`Sauvegarde terminée : ${totalRows} lignes`);
      await load();
    } catch (e: any) {
      await supabase.from("backup_jobs").update({ status: "failed", error_message: e.message }).eq("id", job!.id);
      toast.error(`Échec : ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const downloadJob = async (j: any) => {
    if (!j.file_path) return;
    const { data, error } = await supabase.storage.from("backups").createSignedUrl(j.file_path, 300);
    if (error || !data) { toast.error("Lien indisponible"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sauvegardes</h1>
        <p className="text-muted-foreground">Exportez l'intégralité de vos données (ZIP JSON) pour archivage et restauration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDriveDownload className="h-5 w-5" /> Nouvelle sauvegarde</CardTitle>
          <CardDescription>Le fichier est téléchargé localement et stocké dans le cloud.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {running && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>{progressMsg}</span><span>{progress}%</span></div>
              <Progress value={progress} />
            </div>
          )}
          <Button disabled={running} onClick={runBackup}>
            <Database className="mr-2 h-4 w-4" /> {running ? "En cours…" : "Lancer une sauvegarde"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead>Taille</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell>{new Date(j.created_at).toLocaleString("fr-FR")}</TableCell>
                  <TableCell>
                    <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>
                      {j.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{j.file_size ? `${(j.file_size / 1024 / 1024).toFixed(2)} MB` : "—"}</TableCell>
                  <TableCell>
                    {j.file_path && (
                      <Button size="sm" variant="outline" onClick={() => downloadJob(j)}>
                        <Download className="mr-2 h-4 w-4" /> Télécharger
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucune sauvegarde</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}