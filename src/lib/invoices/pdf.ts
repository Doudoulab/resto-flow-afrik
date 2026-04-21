import jsPDF from "jspdf";
import { formatFCFA } from "@/lib/currency";

export interface InvoicePDFInput {
  invoice_number: string;
  issued_at: string;
  subtotal: number;
  tax_amount: number;
  service_amount: number;
  tip_amount: number;
  discount_amount: number;
  total: number;
  hash_current?: string | null;
  customer_name?: string | null;
  customer_tax_id?: string | null;
  items_snapshot?: any;
  restaurant_snapshot?: any;
  legal_footer?: string | null;
}

/**
 * Build a PDF/A-friendly invoice (single-page, embedded text, monospace hash).
 * Returns the document as a Blob for download or upload to archive storage.
 */
export function buildInvoicePDF(inv: InvoicePDFInput): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const r = inv.restaurant_snapshot ?? {};
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(r.name ?? "Restaurant", 15, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 6;
  if (r.address) { doc.text(String(r.address), 15, y); y += 5; }
  if (r.tax_id) { doc.text(`NIF: ${r.tax_id}`, 15, y); y += 5; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Facture ${inv.invoice_number}`, 15, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Émise: ${new Date(inv.issued_at).toLocaleString()}`, 120, y + 6);
  y += 14;

  if (inv.customer_name) {
    doc.text(`Client: ${inv.customer_name}`, 15, y); y += 5;
  }
  if (inv.customer_tax_id) {
    doc.text(`NIF client: ${inv.customer_tax_id}`, 15, y); y += 5;
  }
  y += 4;

  // Items
  const items = Array.isArray(inv.items_snapshot) ? inv.items_snapshot : [];
  doc.setFont("helvetica", "bold");
  doc.text("Article", 15, y);
  doc.text("Qté", 120, y);
  doc.text("PU", 140, y);
  doc.text("Total", 175, y, { align: "right" });
  y += 2; doc.line(15, y, 195, y); y += 5;
  doc.setFont("helvetica", "normal");
  for (const it of items) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.text(String(it.name ?? it.name_snapshot ?? "—").slice(0, 60), 15, y);
    doc.text(String(it.quantity ?? 1), 120, y);
    doc.text(formatFCFA(Number(it.unit_price ?? 0)), 140, y);
    doc.text(formatFCFA(Number(it.unit_price ?? 0) * Number(it.quantity ?? 1)), 195, y, { align: "right" });
    y += 5;
  }

  y += 4; doc.line(15, y, 195, y); y += 6;
  const right = (label: string, val: number) => {
    doc.text(label, 130, y); doc.text(formatFCFA(val), 195, y, { align: "right" }); y += 5;
  };
  right("Sous-total", inv.subtotal);
  if (inv.discount_amount) right("Remise", -inv.discount_amount);
  if (inv.tax_amount) right("TVA", inv.tax_amount);
  if (inv.service_amount) right("Service", inv.service_amount);
  if (inv.tip_amount) right("Pourboire", inv.tip_amount);
  doc.setFont("helvetica", "bold");
  right("TOTAL", inv.total);
  doc.setFont("helvetica", "normal");

  if (inv.hash_current) {
    y += 8;
    doc.setFontSize(8);
    doc.text("Empreinte fiscale (SHA-256):", 15, y); y += 4;
    doc.setFont("courier", "normal");
    doc.text(inv.hash_current.match(/.{1,64}/g)?.join("\n") ?? inv.hash_current, 15, y);
    doc.setFont("helvetica", "normal");
  }

  if (inv.legal_footer) {
    doc.setFontSize(8);
    doc.text(String(inv.legal_footer), 15, 285, { maxWidth: 180 });
  }

  return doc.output("blob");
}

export function downloadInvoicePDF(inv: InvoicePDFInput) {
  const blob = buildInvoicePDF(inv);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.invoice_number}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}