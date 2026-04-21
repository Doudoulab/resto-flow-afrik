import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { ClipboardList, LayoutGrid, Flame, Bell, BarChart3, Wallet, Package, CalendarDays, ChefHat, Users as UsersIcon, Settings as SettingsIcon } from "lucide-react";

const ROLE_LABELS: Record<UserRole, string> = {
  manager: "Gérant",
  waiter: "Serveur",
  chef: "Cuisinier",
};

const SHORTCUTS: Record<UserRole, { to: string; icon: any; label: string }[]> = {
  waiter: [
    { to: "/app/floor", icon: LayoutGrid, label: "Salle" },
    { to: "/app/orders?new=1", icon: ClipboardList, label: "Nouvelle commande" },
    { to: "/app/reservations", icon: CalendarDays, label: "Réservations" },
    { to: "/app/customers", icon: UsersIcon, label: "Ardoises" },
  ],
  chef: [
    { to: "/app/kitchen", icon: Flame, label: "Écran cuisine" },
    { to: "/app/incoming", icon: Bell, label: "Commandes QR" },
    { to: "/app/stock", icon: Package, label: "Stock" },
    { to: "/app/menu", icon: ChefHat, label: "Menu" },
  ],
  manager: [
    { to: "/app/reports", icon: BarChart3, label: "Rapports" },
    { to: "/app/accounting", icon: Wallet, label: "Comptabilité" },
    { to: "/app/staff", icon: UsersIcon, label: "Personnel" },
    { to: "/app/settings", icon: SettingsIcon, label: "Paramètres" },
  ],
};

export const RoleQuickPanel = () => {
  const { role, setRole } = useUserRole();
  const items = SHORTCUTS[role];

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-medium text-muted-foreground">Vue rapide</p>
          <div className="flex gap-1">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
              <Button
                key={r}
                size="sm"
                variant={r === role ? "default" : "ghost"}
                onClick={() => setRole(r)}
                className="h-7 px-2 text-xs"
              >
                {ROLE_LABELS[r]}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {items.map(it => (
            <Link key={it.to} to={it.to}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5">
                <it.icon className="h-5 w-5" />
                <span className="text-xs font-medium text-center leading-tight">{it.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
