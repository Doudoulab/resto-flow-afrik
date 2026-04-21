import { supabase } from "@/integrations/supabase/client";

export interface PmsExportParams {
  restaurantId: string;
  from: string;
  to: string;
  onlyPending?: boolean;
}

export interface PmsRow {
  order_id: string;
  invoice_number: string | null;
  date: string;
  room_number: string | null;
  guest_name: string | null;
  subtotal: number;
  tax_amount: number;
  service_amount: number;
  total: number;
  currency: string;
}

export async function fetchPmsRows({ restaurantId, from, to, onlyPending = false }: PmsExportParams): Promise<PmsRow[]> {
  let q = supabase
    .from("orders")
    .select("id,invoice_number,created_at,room_number,guest_name,subtotal,tax_amount,service_amount,total,payment_method,pms_exported_at")
    .eq("restaurant_id", restaurantId)
    .eq("payment_method", "room_charge")
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`)
    .order("created_at", { ascending: true });
  if (onlyPending) q = q.is("pms_exported_at", null);
  const { data, error } = await q;
  if (error) throw error;

  const { data: resto } = await supabase
    .from("restaurants").select("currency").eq("id", restaurantId).maybeSingle();
  const currency = resto?.currency ?? "XOF";

  return (data ?? []).map((o) => ({
    order_id: o.id,
    invoice_number: o.invoice_number,
    date: o.created_at,
    room_number: o.room_number,
    guest_name: o.guest_name,
    subtotal: Number(o.subtotal ?? 0),
    tax_amount: Number(o.tax_amount ?? 0),
    service_amount: Number(o.service_amount ?? 0),
    total: Number(o.total ?? 0),
    currency,
  }));
}

export function rowsToCSV(rows: PmsRow[]): string {
  const header = ["order_id", "invoice_number", "date", "room_number", "guest_name", "subtotal", "tax_amount", "service_amount", "total", "currency"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const r of rows) lines.push(header.map((h) => escape((r as any)[h])).join(","));
  return lines.join("\r\n");
}

export async function markRowsExported(orderIds: string[]) {
  if (!orderIds.length) return;
  await supabase
    .from("orders")
    .update({ pms_exported_at: new Date().toISOString(), pms_export_status: "exported" })
    .in("id", orderIds);
}

export function downloadPmsCSV(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function buildMailtoLink(to: string, rows: PmsRow[], rangeLabel: string): string {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const subject = encodeURIComponent(`Export PMS — ${rangeLabel} (${rows.length} extras)`);
  const body = encodeURIComponent(
    `Bonjour,\n\nVeuillez trouver l'export des extras restaurant pour ${rangeLabel}.\n\n` +
    `Nombre d'opérations: ${rows.length}\nMontant total: ${total}\n\nCordialement.`
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}