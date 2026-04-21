import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Package, Users, Settings,
  ChefHat, CalendarDays, Wallet, Clock, LayoutGrid, Sparkles, BookUser, Bell,
  ShieldCheck, Flame, Truck, PackagePlus, ClipboardCheck, BarChart3, BookOpen,
  Receipt, Banknote, Lock, HardDriveDownload, Activity, Printer, FileCheck2,
  FileSpreadsheet, Bug, Wine, Utensils, TrendingUp, LineChart, Hotel, Hand,
  ChevronDown, ToggleRight,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isModuleEnabled, type ModuleKey } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Item = { to: string; end?: boolean; icon: any; label: string; module?: ModuleKey };

const SECTIONS: { id: string; label: string; items: Item[] }[] = [
  {
    id: "essentials",
    label: "Essentiel",
    items: [
      { to: "/app", end: true, icon: LayoutDashboard, label: "Tableau de bord" },
      { to: "/app/orders", icon: ClipboardList, label: "Commandes" },
      { to: "/app/floor", icon: LayoutGrid, label: "Salle" },
      { to: "/app/reservations", icon: CalendarDays, label: "Réservations" },
      { to: "/app/menu", icon: UtensilsCrossed, label: "Menu" },
      { to: "/app/stock", icon: Package, label: "Stock" },
      { to: "/app/staff", icon: Users, label: "Personnel" },
    ],
  },
  {
    id: "kitchen",
    label: "Cuisine",
    items: [
      { to: "/app/incoming", icon: Bell, label: "Commandes QR", module: "incoming" },
      { to: "/app/kitchen", icon: Flame, label: "Écran cuisine", module: "kitchen" },
      { to: "/app/printers", icon: Printer, label: "Imprimantes", module: "printers" },
    ],
  },
  {
    id: "operations",
    label: "Opérations",
    items: [
      { to: "/app/suppliers", icon: Truck, label: "Fournisseurs", module: "suppliers" },
      { to: "/app/receipts", icon: PackagePlus, label: "Réceptions", module: "receipts" },
      { to: "/app/inventory", icon: ClipboardCheck, label: "Inventaires", module: "inventory" },
      { to: "/app/timeclock", icon: Clock, label: "Pointage", module: "timeclock" },
      { to: "/app/customers", icon: BookUser, label: "Ardoises", module: "customers" },
    ],
  },
  {
    id: "finances",
    label: "Finances",
    items: [
      { to: "/app/reports", icon: BarChart3, label: "Rapports", module: "reports" },
      { to: "/app/accounting", icon: Wallet, label: "Comptabilité", module: "accounting" },
      { to: "/app/ledger", icon: BookOpen, label: "Grand livre", module: "accounting" },
      { to: "/app/tax", icon: Receipt, label: "TVA", module: "accounting" },
      { to: "/app/payroll", icon: Banknote, label: "Paie", module: "payroll" },
    ],
  },
  {
    id: "advanced",
    label: "Haut de gamme",
    items: [
      { to: "/app/wines", icon: Wine, label: "Cave à vins", module: "wines" },
      { to: "/app/tasting", icon: Utensils, label: "Menus dégustation", module: "tasting" },
      { to: "/app/gueridon", icon: Hand, label: "Guéridon", module: "gueridon" },
      { to: "/app/pms", icon: Hotel, label: "PMS hôtel", module: "pms" },
      { to: "/app/menu-engineering", icon: TrendingUp, label: "Menu Engineering", module: "menu_engineering" },
      { to: "/app/analytics", icon: LineChart, label: "Analytics", module: "analytics" },
      { to: "/app/advisor", icon: Sparkles, label: "Conseil IA", module: "advisor" },
    ],
  },
  {
    id: "system",
    label: "Système",
    items: [
      { to: "/app/audit", icon: ShieldCheck, label: "Audit", module: "audit" },
      { to: "/app/security", icon: Lock, label: "Sécurité (2FA)", module: "security" },
      { to: "/app/backups", icon: HardDriveDownload, label: "Sauvegardes", module: "backups" },
      { to: "/app/health", icon: Activity, label: "État système", module: "health" },
      { to: "/app/fiscal", icon: FileCheck2, label: "Vérif. fiscale", module: "fiscal" },
      { to: "/app/exports", icon: FileSpreadsheet, label: "Exports", module: "exports" },
      { to: "/app/errors", icon: Bug, label: "Erreurs", module: "errors" },
    ],
  },
  {
    id: "settings",
    label: "Configuration",
    items: [
      { to: "/app/modules", icon: ToggleRight, label: "Modules" },
      { to: "/app/settings", icon: Settings, label: "Paramètres" },
    ],
  },
];

export const AppSidebar = () => {
  const { restaurant, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const enabled = (restaurant as any)?.enabled_modules as string[] | undefined;
  const isOwner = profile?.is_owner ?? false;
  // Sections restricted to owners (employees won't see Finances or System)
  const OWNER_ONLY_SECTIONS = new Set(["finances", "system", "settings"]);

  const filteredSections = SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(it => !it.module || isModuleEnabled(enabled, it.module)),
  }))
    .filter(s => isOwner || !OWNER_ONLY_SECTIONS.has(s.id))
    .filter(s => s.items.length > 0);

  // Auto-open the section containing current route
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { essentials: true, settings: true };
    filteredSections.forEach(s => {
      if (s.items.some(it => location.pathname === it.to || (it.to !== "/app" && location.pathname.startsWith(it.to)))) {
        initial[s.id] = true;
      }
    });
    return initial;
  });

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}` || "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-semibold text-sidebar-foreground">{restaurant?.name || "RestoFlow"}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{profile?.is_owner ? "Gérant" : "Employé"}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredSections.map(section => {
          const isOpen = openSections[section.id] ?? false;
          // When collapsed (icon mode), don't show group label and always show items
          if (collapsed) {
            return (
              <SidebarGroup key={section.id}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map(item => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild tooltip={item.label}>
                          <NavLink to={item.to} end={item.end} className={({ isActive }) =>
                            cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium")
                          }>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }
          return (
            <Collapsible
              key={section.id}
              open={isOpen}
              onOpenChange={(o) => setOpenSections(prev => ({ ...prev, [section.id]: o }))}
            >
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:text-sidebar-foreground">
                    <span>{section.label}</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map(item => (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton asChild>
                            <NavLink to={item.to} end={item.end} className={({ isActive }) =>
                              cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium")
                            }>
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground shrink-0">
              {initials.toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.first_name} {profile?.last_name}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
