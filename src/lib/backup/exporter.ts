import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

const TABLES = [
  "restaurants", "profiles", "user_roles", "menu_categories", "menu_items",
  "menu_item_variants", "menu_item_modifier_groups", "menu_item_modifiers",
  "menu_item_recipes", "kitchen_stations", "restaurant_tables",
  "orders", "order_items", "order_payments", "payments",
  "invoices", "customers", "customer_credit_transactions",
  "stock_items", "stock_receipts", "stock_receipt_items", "stock_counts", "stock_count_items",
  "suppliers", "expenses", "accounting_accounts", "accounting_entries",
  "payroll_periods", "payroll_entries", "payroll_settings",
  "tax_declarations", "audit_log", "reservations", "printers",
  "mobile_money_operators", "payment_configs",
] as const;

export type BackupProgress = (msg: string, pct: number) => void;

export async function buildBackupZip(restaurantId: string, onProgress?: BackupProgress) {
  const zip = new JSZip();
  const meta: Record<string, number> = {};
  let i = 0;
  for (const t of TABLES) {
    onProgress?.(`Export ${t}…`, Math.round((i / TABLES.length) * 90));
    let from = 0; const pageSize = 1000; const all: any[] = [];
    while (true) {
      const { data, error } = await (supabase as any).from(t).select("*").eq("restaurant_id", restaurantId).range(from, from + pageSize - 1);
      if (error) {
        // Some tables may not have restaurant_id (profiles for owner)
        if (error.code === "42703") {
          const { data: d2 } = await (supabase as any).from(t).select("*").range(from, from + pageSize - 1);
          if (d2?.length) all.push(...d2);
          break;
        }
        break;
      }
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    zip.file(`${t}.json`, JSON.stringify(all, null, 2));
    meta[t] = all.length;
    i++;
  }
  zip.file("manifest.json", JSON.stringify({
    restaurant_id: restaurantId,
    exported_at: new Date().toISOString(),
    counts: meta,
    version: 1,
  }, null, 2));
  onProgress?.("Compression…", 95);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  onProgress?.("Terminé", 100);
  return { blob, tables: Object.keys(meta), totalRows: Object.values(meta).reduce((a, b) => a + b, 0) };
}

export async function uploadBackup(restaurantId: string, blob: Blob) {
  const path = `${restaurantId}/backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
  const { error } = await supabase.storage.from("backups").upload(path, blob, {
    contentType: "application/zip", upsert: false,
  });
  if (error) throw error;
  return path;
}