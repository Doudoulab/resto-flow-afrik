import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Package,
  Users,
  Settings,
  LogOut,
  ChefHat,
  Menu as MenuIcon,
  CalendarDays,
  Wallet,
  Clock,
  LayoutGrid,
  Sparkles,
  BookUser,
  Bell,
  ShieldCheck,
  Flame,
  Truck,
  PackagePlus,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  Receipt,
  Banknote,
  Lock,
  HardDriveDownload,
  Activity,
  Printer,
  FileCheck2,
  FileSpreadsheet,
  Bug,
  Wine,
  Utensils,
  TrendingUp,
  LineChart,
  Hotel,
  Hand,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { prefetchForOffline } from "@/lib/offline/prefetch";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

const navItems = [
  { to: "/app", end: true, icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/app/orders", icon: ClipboardList, label: "Commandes" },
  { to: "/app/incoming", icon: Bell, label: "Commandes QR" },
  { to: "/app/kitchen", icon: Flame, label: "Écran cuisine" },
  { to: "/app/floor", icon: LayoutGrid, label: "Salle" },
  { to: "/app/reservations", icon: CalendarDays, label: "Réservations" },
  { to: "/app/menu", icon: UtensilsCrossed, label: "Menu" },
  { to: "/app/tasting", icon: Utensils, label: "Menus dégustation" },
  { to: "/app/wines", icon: Wine, label: "Cave à vins" },
  { to: "/app/stock", icon: Package, label: "Stock" },
  { to: "/app/suppliers", icon: Truck, label: "Fournisseurs" },
  { to: "/app/receipts", icon: PackagePlus, label: "Réceptions" },
  { to: "/app/inventory", icon: ClipboardCheck, label: "Inventaires" },
  { to: "/app/reports", icon: BarChart3, label: "Rapports" },
  { to: "/app/menu-engineering", icon: TrendingUp, label: "Menu Engineering" },
  { to: "/app/analytics", icon: LineChart, label: "Analytics avancées" },
  { to: "/app/gueridon", icon: Hand, label: "Guéridon" },
  { to: "/app/pms", icon: Hotel, label: "Réconciliation PMS" },
  { to: "/app/accounting", icon: Wallet, label: "Comptabilité" },
  { to: "/app/ledger", icon: BookOpen, label: "Grand livre" },
  { to: "/app/payroll", icon: Banknote, label: "Paie" },
  { to: "/app/tax", icon: Receipt, label: "TVA" },
  { to: "/app/staff", icon: Users, label: "Personnel" },
  { to: "/app/timeclock", icon: Clock, label: "Pointage" },
  { to: "/app/customers", icon: BookUser, label: "Ardoises" },
  { to: "/app/advisor", icon: Sparkles, label: "Conseil IA" },
  { to: "/app/audit", icon: ShieldCheck, label: "Audit" },
  { to: "/app/security", icon: Lock, label: "Sécurité (2FA)" },
  { to: "/app/backups", icon: HardDriveDownload, label: "Sauvegardes" },
  { to: "/app/health", icon: Activity, label: "État système" },
  { to: "/app/printers", icon: Printer, label: "Imprimantes" },
  { to: "/app/fiscal", icon: FileCheck2, label: "Vérif. fiscale" },
  { to: "/app/exports", icon: FileSpreadsheet, label: "Exports compta/PMS" },
  { to: "/app/errors", icon: Bug, label: "Monitoring erreurs" },
  { to: "/app/settings", icon: Settings, label: "Paramètres" },
];

export const AppLayout = () => {
  const { restaurant, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (restaurant?.id) {
      prefetchForOffline(restaurant.id);
      const onOnline = () => restaurant?.id && prefetchForOffline(restaurant.id);
      window.addEventListener("online", onOnline);
      return () => window.removeEventListener("online", onOnline);
    }
  }, [restaurant?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}` || "?";

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <ChefHat className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate font-semibold text-sidebar-foreground">
            {restaurant?.name || "RestoFlow"}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {profile?.is_owner ? "Gérant" : "Employé"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {initials.toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.first_name} {profile?.last_name}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col bg-sidebar md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-sidebar">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <MenuIcon className="h-5 w-5" />
          </Button>
          <p className="flex-1 font-semibold">{restaurant?.name || "RestoFlow"}</p>
          <OfflineIndicator />
          <LanguageSwitcher />
          <ThemeToggle />
        </header>
        {/* Desktop top-right theme toggle */}
        <div className="hidden md:flex h-12 items-center justify-end gap-3 border-b border-border bg-card px-4">
          <OfflineIndicator />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
