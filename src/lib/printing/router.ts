import { supabase } from "@/integrations/supabase/client";
import { print, type PrinterConfig } from "./transports";
import { buildKitchenTicket, buildReceipt } from "./escpos";
import { toast } from "sonner";

let cache: { restaurantId: string; printers: any[]; ts: number } | null = null;
const CACHE_MS = 30_000;

async function loadPrinters(restaurantId: string) {
  if (cache && cache.restaurantId === restaurantId && Date.now() - cache.ts < CACHE_MS) return cache.printers;
  const { data } = await supabase.from("printers").select("*").eq("restaurant_id", restaurantId).eq("is_active", true);
  cache = { restaurantId, printers: data || [], ts: Date.now() };
  return cache.printers;
}

export async function printKitchenTicket(restaurantId: string, opts: Parameters<typeof buildKitchenTicket>[0] & { stationId?: string | null }) {
  const printers = await loadPrinters(restaurantId);
  const targets = printers.filter((p) =>
    (p.printer_type === "kitchen" || p.printer_type === "bar") &&
    (!p.station_id || !opts.stationId || p.station_id === opts.stationId)
  );
  if (targets.length === 0) { toast.message("Aucune imprimante cuisine — ticket en HTML uniquement"); return false; }
  const data = buildKitchenTicket(opts);
  let ok = 0;
  for (const p of targets) {
    try { await print(p as PrinterConfig, data); ok++; } catch (e: any) { toast.error(`${p.name}: ${e.message}`); }
  }
  if (ok > 0) toast.success(`Ticket envoyé (${ok}/${targets.length})`);
  return ok > 0;
}

export async function printReceiptAndOpenDrawer(restaurantId: string, opts: Parameters<typeof buildReceipt>[0]) {
  const printers = await loadPrinters(restaurantId);
  const targets = printers.filter((p) => p.printer_type === "cashier");
  if (targets.length === 0) { toast.message("Aucune imprimante caisse configurée"); return false; }
  let ok = 0;
  for (const p of targets) {
    const data = buildReceipt({ ...opts, openDrawer: !!p.open_drawer, width: p.paper_width === 80 ? 48 : 32 });
    try { await print(p as PrinterConfig, data); ok++; } catch (e: any) { toast.error(`${p.name}: ${e.message}`); }
  }
  if (ok > 0) toast.success("Reçu imprimé");
  return ok > 0;
}

export const invalidatePrinterCache = () => { cache = null; };