import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, LayoutDashboard, Building2, CreditCard, BarChart3, Bug, Webhook, UserCog, ArrowLeft, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Vue d'ensemble" },
  { to: "/admin/restaurants", icon: Building2, label: "Restaurants" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
  { to: "/admin/chariow", icon: Wallet, label: "Paiements Chariow" },
  { to: "/admin/stats", icon: BarChart3, label: "Statistiques" },
  { to: "/admin/webhooks", icon: Webhook, label: "Webhooks" },
  { to: "/admin/errors", icon: Bug, label: "Erreurs globales" },
  { to: "/admin/admins", icon: UserCog, label: "Super-admins" },
];

export default function AdminLayout() {
  const { isAdmin, loading, refreshAdminStatus } = usePlatformAdmin();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimFirstAdmin = async () => {
    if (!user || isClaiming) return;

    setIsClaiming(true);

    const { data, error } = await supabase.rpc("claim_first_platform_admin");

    if (error) {
      toast.error(error.message);
      setIsClaiming(false);
      return;
    }

    if (data && typeof data === "object" && "success" in data && data.success) {
      toast.success("Accès super-admin activé");
      refreshAdminStatus();
      setIsClaiming(false);
      return;
    }

    const reason = data && typeof data === "object" && "error" in data ? String(data.error) : null;
    toast.error(
      reason === "already_initialized"
        ? "Un super-admin existe déjà. Demande-lui de t'ajouter dans la liste."
        : "Impossible d'activer l'accès super-admin."
    );
    setIsClaiming(false);
  };

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
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button onClick={() => navigate("/app")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à l'app
          </Button>
          <Button onClick={handleClaimFirstAdmin} disabled={isClaiming}>
            {isClaiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Activer le premier super-admin
          </Button>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Utilise ce bouton uniquement pour l'initialisation du tout premier compte super-admin. Ensuite, la gestion se fera depuis l'onglet Super-admins.
        </p>
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