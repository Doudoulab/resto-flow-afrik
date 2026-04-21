import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  app: "Tableau de bord", orders: "Commandes", floor: "Salle", reservations: "Réservations",
  menu: "Menu", stock: "Stock", staff: "Personnel", incoming: "Commandes QR",
  kitchen: "Écran cuisine", printers: "Imprimantes", suppliers: "Fournisseurs",
  receipts: "Réceptions", inventory: "Inventaires", timeclock: "Pointage",
  customers: "Ardoises clients", reports: "Rapports", accounting: "Comptabilité",
  ledger: "Grand livre", tax: "TVA", payroll: "Paie", wines: "Cave à vins",
  tasting: "Menus dégustation", gueridon: "Guéridon", pms: "Réconciliation PMS",
  "menu-engineering": "Menu Engineering", analytics: "Analytics avancées",
  advisor: "Conseil IA", audit: "Audit", security: "Sécurité (2FA)",
  backups: "Sauvegardes", health: "État système", fiscal: "Vérif. fiscale",
  exports: "Exports", errors: "Monitoring erreurs", modules: "Modules",
  settings: "Paramètres",
};

export const PageTitle = () => {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb chain
  const crumbs = segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] || seg,
    to: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  useEffect(() => {
    const last = crumbs[crumbs.length - 1]?.label;
    document.title = last ? `${last} • RestoFlow` : "RestoFlow";
  }, [pathname]);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 px-4 md:px-8 py-2 text-sm text-muted-foreground border-b border-border bg-card/50" aria-label="Breadcrumb">
      <Link to="/app" className="hover:text-foreground transition-colors flex items-center">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.slice(1).map(c => (
        <span key={c.to} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {c.isLast ? (
            <span className="font-medium text-foreground">{c.label}</span>
          ) : (
            <Link to={c.to} className="hover:text-foreground transition-colors">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
};
