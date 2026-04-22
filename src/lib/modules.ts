// Module definitions: which nav items belong to which feature module.
// "core" modules are always visible. Others can be toggled by the owner.

export type ModuleKey =
  | "kitchen"        // Écran cuisine + Imprimantes + Commandes QR
  | "printers"
  | "incoming"
  | "reports"        // Rapports
  | "accounting"     // Comptabilité + Grand livre + TVA
  | "customers"      // Ardoises clients
  | "suppliers"      // Fournisseurs + Réceptions + Inventaires
  | "receipts"
  | "inventory"
  | "timeclock"      // Pointage
  | "payroll"        // Paie
  | "wines"          // Cave à vins
  | "tasting"        // Menus dégustation
  | "gueridon"       // Service guéridon
  | "pms"            // Réconciliation PMS hôtel
  | "menu_engineering"
  | "analytics"      // Analytics avancées
  | "advisor"        // Conseil IA
  | "audit"          // Audit log
  | "security"       // 2FA
  | "backups"
  | "health"
  | "fiscal"         // Vérif. fiscale
  | "exports"        // Exports compta/PMS
  | "errors";        // Monitoring erreurs

export interface ModuleInfo {
  key: ModuleKey;
  label: string;
  description: string;
  category: "operations" | "kitchen" | "finances" | "advanced" | "system";
}

export const ALL_MODULES: ModuleInfo[] = [
  // Operations extras
  { key: "customers", label: "Ardoises clients", description: "Gestion crédits & profils clients VIP", category: "operations" },
  { key: "timeclock", label: "Pointage", description: "Suivi des heures du personnel", category: "operations" },
  { key: "suppliers", label: "Fournisseurs", description: "Gestion des fournisseurs", category: "operations" },
  { key: "receipts", label: "Réceptions", description: "Bons de réception marchandises", category: "operations" },
  { key: "inventory", label: "Inventaires", description: "Comptages d'inventaire périodiques", category: "operations" },

  // Kitchen
  { key: "kitchen", label: "Écran cuisine", description: "KDS pour la brigade", category: "kitchen" },
  { key: "printers", label: "Imprimantes", description: "Tickets cuisine ESC/POS", category: "kitchen" },
  { key: "incoming", label: "Commandes QR", description: "Commandes clients via QR code", category: "kitchen" },

  // Finances
  { key: "reports", label: "Rapports", description: "Rapports de ventes journaliers", category: "finances" },
  { key: "accounting", label: "Comptabilité SYSCOHADA", description: "Plan comptable, journaux, grand livre", category: "finances" },
  { key: "payroll", label: "Paie", description: "Bulletins, CNSS, IPRES, IRPP", category: "finances" },

  // Advanced (haut de gamme)
  { key: "wines", label: "Cave à vins", description: "Sommellerie & accords mets-vins", category: "advanced" },
  { key: "tasting", label: "Menus dégustation", description: "Menus en plusieurs services", category: "advanced" },
  { key: "gueridon", label: "Service guéridon", description: "Prise de commande tactile en salle", category: "advanced" },
  { key: "pms", label: "Réconciliation PMS", description: "Intégration hôtel (Opera/Mews)", category: "advanced" },
  { key: "menu_engineering", label: "Menu Engineering", description: "Matrice popularité × marge", category: "advanced" },
  { key: "analytics", label: "Analytics avancées", description: "Performance serveurs & marges", category: "advanced" },
  { key: "advisor", label: "Conseil IA", description: "Recommandations par IA", category: "advanced" },

  // System
  { key: "audit", label: "Audit", description: "Journal d'audit", category: "system" },
  { key: "security", label: "Sécurité (2FA)", description: "Double authentification", category: "system" },
  { key: "backups", label: "Sauvegardes", description: "Exports de sauvegarde", category: "system" },
  { key: "health", label: "État système", description: "Monitoring santé app", category: "system" },
  { key: "fiscal", label: "Vérif. fiscale", description: "Chaînage fiscal des factures", category: "system" },
  { key: "exports", label: "Exports compta/PMS", description: "Exports FEC, Excel, PMS", category: "system" },
  { key: "errors", label: "Monitoring erreurs", description: "Logs d'erreurs runtime", category: "system" },
];

export const DEFAULT_ENABLED: ModuleKey[] = [
  "kitchen", "printers", "incoming",
  "reports", "accounting", "customers",
  "suppliers", "receipts", "inventory", "timeclock",
];

export const isModuleEnabled = (enabled: string[] | null | undefined, key: ModuleKey): boolean => {
  if (!enabled) return DEFAULT_ENABLED.includes(key);
  return enabled.includes(key);
};

// ============== Plan gating ==============
// Map each module to the minimum subscription tier required to access it.
// "free" = available during trial / free, "pro" = Pro tier+, "business" = Business only.

import type { PlanTier } from "@/hooks/useSubscription";

export const MODULE_PLAN_MAP: Record<ModuleKey, PlanTier> = {
  // Pro tier (most operational features)
  kitchen: "pro",
  printers: "pro",
  incoming: "pro",
  reports: "pro",
  customers: "pro",
  suppliers: "pro",
  receipts: "pro",
  inventory: "pro",
  timeclock: "pro",
  wines: "pro",
  tasting: "pro",
  gueridon: "pro",
  menu_engineering: "pro",
  advisor: "pro",
  fiscal: "pro",

  // Business tier (advanced finance / multi-site / integrations)
  accounting: "business",
  payroll: "business",
  pms: "business",
  analytics: "business",
  audit: "business",
  security: "business",
  backups: "business",
  exports: "business",

  // System utilities — available to anyone authenticated
  health: "free",
  errors: "free",
};

// Map app routes (under /app) to their gating module key.
// Routes not listed here are considered free / always accessible.
export const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  "/app/kitchen": "kitchen",
  "/app/printers": "printers",
  "/app/incoming": "incoming",
  "/app/reports": "reports",
  "/app/customers": "customers",
  "/app/suppliers": "suppliers",
  "/app/receipts": "receipts",
  "/app/inventory": "inventory",
  "/app/timeclock": "timeclock",
  "/app/wines": "wines",
  "/app/tasting": "tasting",
  "/app/gueridon": "gueridon",
  "/app/menu-engineering": "menu_engineering",
  "/app/advisor": "advisor",
  "/app/fiscal": "fiscal",
  "/app/accounting": "accounting",
  "/app/ledger": "accounting",
  "/app/tax": "accounting",
  "/app/payroll": "payroll",
  "/app/pms": "pms",
  "/app/analytics": "analytics",
  "/app/audit": "audit",
  "/app/security": "security",
  "/app/backups": "backups",
  "/app/exports": "exports",
};

export const getRequiredTier = (moduleKey: ModuleKey | undefined): PlanTier => {
  if (!moduleKey) return "free";
  return MODULE_PLAN_MAP[moduleKey] ?? "free";
};
