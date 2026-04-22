import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Shield, LayoutDashboard, Building2, CreditCard, BarChart3, Bug, Webhook, UserCog, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Vue d'ensemble" },
  { to: "/admin/restaurants", icon: Building2, label: "Restaurants" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
  { to: "/admin/stats", icon: BarChart3, label: "Statistiques" },
  { to: "/admin/webhooks", icon: Webhook, label: "Webhooks Paddle" },
  { to: "/admin/errors", icon: Bug, label: "Erreurs globales" },
  { to: "/admin/admins", icon: UserCog, label: "Super-admins" },
];

export default function AdminLayout() {
  const { isAdmin, loading } = usePlatformAdmin();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Accès refusé</h1>
          <p className="text-muted-foreground mt-2">Cette zone est réservée aux super-administrateurs de la plateforme.</p>
        </div>
        <Button onClick={() => navigate("/app")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à l'app
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive">
            <Shield className="h-5 w-5 text-destructive-foreground" />
          </div>
          <div>
            <p className="font-semibold">Super Admin</p>
            <p className="text-xs text-muted-foreground">RestoFlow Platform</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate("/app")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à l'app
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}