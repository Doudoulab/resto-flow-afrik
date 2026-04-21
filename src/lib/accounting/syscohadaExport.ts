import { supabase } from "@/integrations/supabase/client";

/**
 * Build a SYSCOHADA / FEC-style CSV export of accounting entries
 * for a given period. Columns follow the OHADA "Fichier des Écritures
 * Comptables" convention (semicolon-separated, ISO dates, 2-decimal amounts).
 */
export interface SyscohadaExportParams {
  restaurantId: string;
  from: string; // yyyy-mm-dd
  to: string;   // yyyy-mm-dd
}

const FEC_COLUMNS = [
  "JournalCode", "JournalLib", "EcritureNum", "EcritureDate",
  "CompteNum", "CompteLib", "PieceRef", "PieceDate",
  "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet",
  "ValidDate", "Montantdevise", "Idevise",
];

const escape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/[\r\n;]/g, " ").trim();
  return s;
};

const fmtAmount = (n: number): string => (Math.round((n ?? 0) * 100) / 100).toFixed(2).replace(".", ",");

export async function buildSyscohadaCSV({ restaurantId, from, to }: SyscohadaExportParams): Promise<string> {
  const { data, error } = await supabase
    .from("accounting_entries")
    .select("entry_date,journal,reference,label,account_code,debit,credit,id,created_at")
    .eq("restaurant_id", restaurantId)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const { data: accounts } = await supabase
    .from("accounting_accounts")
    .select("code,label")
    .eq("restaurant_id", restaurantId);
  const labelMap = new Map((accounts ?? []).map((a) => [a.code, a.label]));

  const journalLabels: Record<string, string> = {
    VTE: "Ventes", ACH: "Achats", PAI: "Paie", BNQ: "Banque", OD: "Opérations diverses",
  };

  const lines: string[] = [FEC_COLUMNS.join(";")];
  let n = 1;
  for (const e of data ?? []) {
    const journalLib = journalLabels[e.journal] ?? e.journal;
    const compteLib = labelMap.get(e.account_code) ?? "";
    const row = [
      e.journal, journalLib, String(n).padStart(6, "0"), e.entry_date.replace(/-/g, ""),
      e.account_code, compteLib, e.reference ?? "", e.entry_date.replace(/-/g, ""),
      e.label, fmtAmount(Number(e.debit)), fmtAmount(Number(e.credit)), "", "",
      e.entry_date.replace(/-/g, ""), "", "",
    ].map(escape).join(";");
    lines.push(row);
    n++;
  }
  return lines.join("\r\n");
}

export function downloadSyscohadaCSV(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}