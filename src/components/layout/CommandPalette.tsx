import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { isModuleEnabled, type ModuleKey } from "@/lib/modules";
import { useNavMemory } from "@/hooks/useNavMemory";
import { Star } from "lucide-react";
import {
  LayoutDashboard, ClipboardList, LayoutGrid, CalendarDays, UtensilsCrossed,
  Package, Users, Settings, Bell, Flame, Printer, Truck, PackagePlus,
  ClipboardCheck, Clock, BookUser, BarChart3, Wallet, BookOpen, Receipt,
  Banknote, Wine, Utensils, Hand, Hotel, TrendingUp, LineChart, Sparkles,
  ShieldCheck, Lock, HardDriveDownload, Activity, FileCheck2, FileSpreadsheet,
  Bug, ToggleRight, Plus, CreditCard,
} from "lucide-react";

type NavCmd = { label: string; to: string; icon: any; module?: ModuleKey; group: string; ownerOnly?: boolean };

const COMMANDS: NavCmd[] = [
  { label: "Tableau de bord", to: "/app", icon: LayoutDashboard, group: "Essentiel" },
  { label: "Commandes", to: "/app/orders", icon: ClipboardList, group: "Essentiel" },
  { label: "Salle", to: "/app/floor", icon: LayoutGrid, group: "Essentiel" },
  { label: "Réservations", to: "/app/reservations", icon: CalendarDays, group: "Essentiel" },
  { label: "Menu", to: "/app/menu", icon: UtensilsCrossed, group: "Essentiel" },
  { label: "Stock", to: "/app/stock", icon: Package, group: "Essentiel" },
  { label: "Personnel", to: "/app/staff", icon: Users, group: "Essentiel" },
  { label: "Commandes QR", to: "/app/incoming", icon: Bell, module: "incoming", group: "Cuisine" },
  { label: "Écran cuisine", to: "/app/kitchen", icon: Flame, module: "kitchen", group: "Cuisine" },
  { label: "Imprimantes", to: "/app/printers", icon: Printer, module: "printers", group: "Cuisine" },
  { label: "Fournisseurs", to: "/app/suppliers", icon: Truck, module: "suppliers", group: "Opérations" },
  { label: "Réceptions", to: "/app/receipts", icon: PackagePlus, module: "receipts", group: "Opérations" },
  { label: "Inventaires", to: "/app/inventory", icon: ClipboardCheck, module: "inventory", group: "Opérations" },
  { label: "Pointage", to: "/app/timeclock", icon: Clock, module: "timeclock", group: "Opérations" },
  { label: "Ardoises clients", to: "/app/customers", icon: BookUser, module: "customers", group: "Opérations" },
  { label: "Rapports", to: "/app/reports", icon: BarChart3, module: "reports", group: "Finances", ownerOnly: true },
  { label: "Comptabilité", to: "/app/accounting", icon: Wallet, module: "accounting", group: "Finances", ownerOnly: true },
  { label: "Grand livre", to: "/app/ledger", icon: BookOpen, module: "accounting", group: "Finances", ownerOnly: true },
  { label: "TVA", to: "/app/tax", icon: Receipt, module: "accounting", group: "Finances", ownerOnly: true },
  { label: "Paie", to: "/app/payroll", icon: Banknote, module: "payroll", group: "Finances", ownerOnly: true },
  { label: "Cave à vins", to: "/app/wines", icon: Wine, module: "wines", group: "Haut de gamme" },
  { label: "Menus dégustation", to: "/app/tasting", icon: Utensils, module: "tasting", group: "Haut de gamme" },
  { label: "Guéridon", to: "/app/gueridon", icon: Hand, module: "gueridon", group: "Haut de gamme" },
  { label: "Réconciliation PMS", to: "/app/pms", icon: Hotel, module: "pms", group: "Haut de gamme" },
  { label: "Menu Engineering", to: "/app/menu-engineering", icon: TrendingUp, module: "menu_engineering", group: "Haut de gamme", ownerOnly: true },
  { label: "Analytics avancées", to: "/app/analytics", icon: LineChart, module: "analytics", group: "Haut de gamme", ownerOnly: true },
  { label: "Conseil IA", to: "/app/advisor", icon: Sparkles, module: "advisor", group: "Haut de gamme", ownerOnly: true },
  { label: "Audit", to: "/app/audit", icon: ShieldCheck, module: "audit", group: "Système", ownerOnly: true },
  { label: "Sécurité (2FA)", to: "/app/security", icon: Lock, module: "security", group: "Système", ownerOnly: true },
  { label: "Sauvegardes", to: "/app/backups", icon: HardDriveDownload, module: "backups", group: "Système", ownerOnly: true },
  { label: "État système", to: "/app/health", icon: Activity, module: "health", group: "Système", ownerOnly: true },
  { label: "Vérif. fiscale", to: "/app/fiscal", icon: FileCheck2, module: "fiscal", group: "Système", ownerOnly: true },
  { label: "Exports", to: "/app/exports", icon: FileSpreadsheet, module: "exports", group: "Système", ownerOnly: true },
  { label: "Erreurs", to: "/app/errors", icon: Bug, module: "errors", group: "Système", ownerOnly: true },
  { label: "Modules", to: "/app/modules", icon: ToggleRight, group: "Configuration", ownerOnly: true },
  { label: "Paramètres", to: "/app/settings", icon: Settings, group: "Configuration", ownerOnly: true },
];

const QUICK_ACTIONS = [
  { label: "Nouvelle commande", to: "/app/orders?new=1", icon: Plus },
  { label: "Encaisser une commande", to: "/app/orders?pay=1", icon: CreditCard },
  { label: "Nouvelle réservation", to: "/app/reservations?new=1", icon: CalendarDays },
];

const PaletteCtx = createContext<{ open: () => void } | null>(null);
export const useCommandPalette = () => {
  const ctx = useContext(PaletteCtx);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
};

export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { restaurant, profile } = useAuth();
  const enabled = (restaurant as any)?.enabled_modules as string[] | undefined;
  const isOwner = profile?.is_owner ?? false;
  const { favorites, recents, toggleFavorite, isFavorite } = useNavMemory();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const visible = COMMANDS.filter(c =>
    (!c.module || isModuleEnabled(enabled, c.module)) &&
    (!c.ownerOnly || isOwner)
  );
  const groups = visible.reduce((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {} as Record<string, NavCmd[]>);

  const go = (to: string) => { setOpen(false); navigate(to); };
  const byPath = new Map(visible.map(c => [c.to, c]));
  const favItems = favorites.map(p => byPath.get(p)).filter(Boolean) as NavCmd[];
  const recentItems = recents
    .filter(p => !favorites.includes(p))
    .map(p => byPath.get(p))
    .filter(Boolean) as NavCmd[];

  return (
    <PaletteCtx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher une page, une action..." />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Actions rapides">
            {QUICK_ACTIONS.map(a => (
              <CommandItem key={a.to} onSelect={() => go(a.to)}>
                <a.icon className="mr-2 h-4 w-4" />
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {favItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Favoris">
                {favItems.map(item => (
                  <CommandItem key={`fav-${item.to}`} onSelect={() => go(item.to)}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    <Star className="h-3.5 w-3.5 fill-current text-primary" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {recentItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Récents">
                {recentItems.slice(0, 5).map(item => (
                  <CommandItem key={`rec-${item.to}`} onSelect={() => go(item.to)}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <CommandSeparator />
              <CommandGroup heading={group}>
                {items.map(item => (
                  <CommandItem
                    key={item.to}
                    onSelect={() => go(item.to)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(item.to); }}
                      className="opacity-50 hover:opacity-100"
                      aria-label={isFavorite(item.to) ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      <Star className={`h-3.5 w-3.5 ${isFavorite(item.to) ? "fill-current text-primary" : ""}`} />
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </PaletteCtx.Provider>
  );
};
