import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_owner: boolean;
}
interface Role { user_id: string; role: string; }

const ROLE_LABELS: Record<string, string> = {
  manager: "Gérant",
  waiter: "Serveur",
  kitchen: "Cuisine",
  cashier: "Caissier",
};

const Staff = () => {
  const { restaurant, profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!restaurant) return;
    const [empRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, is_owner").eq("restaurant_id", restaurant.id),
      supabase.from("user_roles").select("user_id, role").eq("restaurant_id", restaurant.id),
    ]);
    setEmployees((empRes.data ?? []) as Employee[]);
    setRoles((roleRes.data ?? []) as Role[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const rolesFor = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Personnel</h1>
        <p className="mt-1 text-muted-foreground">Membres de l'équipe ayant accès à {restaurant?.name}.</p>
      </div>

      {profile?.is_owner && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            L'invitation d'employés par email arrive bientôt. En attendant, partagez l'URL de connexion à vos collaborateurs ; vous pourrez ensuite les rattacher à votre restaurant.
          </AlertDescription>
        </Alert>
      )}

      {employees.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucun membre rattaché à votre restaurant.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {employees.map((e) => {
            const initials = `${e.first_name?.[0] ?? ""}${e.last_name?.[0] ?? ""}`.toUpperCase() || "?";
            const userRoles = rolesFor(e.id);
            return (
              <Card key={e.id} className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{e.first_name} {e.last_name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.is_owner && <Badge>Propriétaire</Badge>}
                      {userRoles.map((r) => (
                        <Badge key={r} variant="secondary">{ROLE_LABELS[r] ?? r}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Staff;
