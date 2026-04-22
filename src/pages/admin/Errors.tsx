import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Errors() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-errors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Erreurs globales</h1>
        <p className="text-muted-foreground mt-1">200 dernières erreurs sur toute la plateforme</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Resto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>}
            {!isLoading && data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune erreur 🎉</TableCell></TableRow>}
            {data?.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString("fr-FR")}</TableCell>
                <TableCell><Badge variant={e.level === "error" ? "destructive" : "secondary"}>{e.level}</Badge></TableCell>
                <TableCell className="max-w-md truncate" title={e.message}>{e.message}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.url || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{e.restaurant_id?.slice(0, 8) || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}