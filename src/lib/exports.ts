import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatFCFA } from "./currency";

interface AccountingRow {
  type: "Recette" | "Dépense";
  date: string;
  description: string;
  category: string;
  amount: number;
}

interface AccountingExportInput {
  restaurantName: string;
  periodLabel: string;
  rows: AccountingRow[];
  revenue: number;
  expenses: number;
  margin: number;
}

export const exportAccountingPDF = (data: AccountingExportInput) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`Comptabilité — ${data.restaurantName}`, 14, 18);
  doc.setFontSize(11);
  doc.text(`Période : ${data.periodLabel}`, 14, 26);

  doc.setFontSize(11);
  doc.text(`Recettes : ${formatFCFA(data.revenue)}`, 14, 36);
  doc.text(`Dépenses : ${formatFCFA(data.expenses)}`, 14, 42);
  doc.text(`Marge : ${formatFCFA(data.margin)}`, 14, 48);

  autoTable(doc, {
    startY: 54,
    head: [["Type", "Date", "Description", "Catégorie", "Montant"]],
    body: data.rows.map((r) => [
      r.type,
      r.date,
      r.description,
      r.category,
      `${r.type === "Dépense" ? "-" : ""}${formatFCFA(Math.abs(r.amount))}`,
    ]),
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(`comptabilite-${data.periodLabel.replace(/\s+/g, "-")}.pdf`);
};

export const exportAccountingExcel = (data: AccountingExportInput) => {
  const wb = XLSX.utils.book_new();

  const summary = [
    ["Restaurant", data.restaurantName],
    ["Période", data.periodLabel],
    [],
    ["Recettes (FCFA)", data.revenue],
    ["Dépenses (FCFA)", data.expenses],
    ["Marge (FCFA)", data.margin],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Synthèse");

  const detail = [
    ["Type", "Date", "Description", "Catégorie", "Montant (FCFA)"],
    ...data.rows.map((r) => [r.type, r.date, r.description, r.category, r.type === "Dépense" ? -Math.abs(r.amount) : Math.abs(r.amount)]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detail), "Détail");

  XLSX.writeFile(wb, `comptabilite-${data.periodLabel.replace(/\s+/g, "-")}.xlsx`);
};

interface PayslipEntry {
  date: string;
  clockIn: string;
  clockOut: string;
  minutes: number;
}

interface PayslipInput {
  restaurantName: string;
  employeeName: string;
  monthLabel: string;
  hourlyRate: number;
  entries: PayslipEntry[];
}

export const exportPayslipPDF = (data: PayslipInput) => {
  const doc = new jsPDF();
  const totalMinutes = data.entries.reduce((s, e) => s + e.minutes, 0);
  const totalHours = totalMinutes / 60;
  const gross = totalHours * data.hourlyRate;

  doc.setFontSize(18);
  doc.text(`Fiche de paie`, 14, 18);
  doc.setFontSize(11);
  doc.text(`${data.restaurantName}`, 14, 26);
  doc.text(`Employé : ${data.employeeName}`, 14, 34);
  doc.text(`Période : ${data.monthLabel}`, 14, 40);
  doc.text(`Taux horaire : ${formatFCFA(data.hourlyRate)} / h`, 14, 46);

  autoTable(doc, {
    startY: 54,
    head: [["Date", "Entrée", "Sortie", "Heures"]],
    body: data.entries.map((e) => {
      const h = Math.floor(e.minutes / 60);
      const m = Math.round(e.minutes % 60);
      return [e.date, e.clockIn, e.clockOut, `${h}h${m.toString().padStart(2, "0")}`];
    }),
    headStyles: { fillColor: [37, 99, 235] },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 60;
  doc.setFontSize(12);
  doc.text(`Total heures : ${totalHours.toFixed(2)} h`, 14, finalY + 12);
  doc.setFontSize(14);
  doc.text(`Salaire brut : ${formatFCFA(gross)}`, 14, finalY + 22);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "Document indicatif basé sur les pointages enregistrés. Sous réserve de validation.",
    14,
    finalY + 34
  );

  doc.save(`fiche-paie-${data.employeeName.replace(/\s+/g, "-")}-${data.monthLabel.replace(/\s+/g, "-")}.pdf`);
};