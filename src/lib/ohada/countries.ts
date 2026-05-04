// Données par défaut pour les 17 pays OHADA + suggestions mobile money & fiscales.
// Toutes les valeurs sont indicatives — modifiables par le gérant dans le wizard.

export interface OhadaCountry {
  code: string;          // ISO-2 minuscules ("sn", "ci"…)
  name: string;
  currency: string;      // XOF, XAF, KMF, GNF, CDF
  flag: string;
  vat: number;           // TVA standard (%)
  service_pct: number;   // service par défaut (%)
  invoice_prefix: string;
  payroll: {
    cnss_employee_pct: number;
    cnss_employer_pct: number;
    ipres_employee_pct: number;
    ipres_employer_pct: number;
    irpp_pct: number;
  };
  mobile_money: { code: string; name: string }[];
}

export const OHADA_COUNTRIES: OhadaCountry[] = [
  { code: "sn", name: "Sénégal", currency: "XOF", flag: "🇸🇳", vat: 18, service_pct: 0, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 0, cnss_employer_pct: 7, ipres_employee_pct: 5.6, ipres_employer_pct: 8.4, irpp_pct: 10 },
    mobile_money: [{ code: "wave", name: "Wave" }, { code: "orange_money", name: "Orange Money" }, { code: "free_money", name: "Free Money" }] },
  { code: "ci", name: "Côte d'Ivoire", currency: "XOF", flag: "🇨🇮", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 6.3, cnss_employer_pct: 7.7, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "wave", name: "Wave" }, { code: "orange_money", name: "Orange Money" }, { code: "mtn_momo", name: "MTN MoMo" }, { code: "moov", name: "Moov Money" }] },
  { code: "bf", name: "Burkina Faso", currency: "XOF", flag: "🇧🇫", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 5.5, cnss_employer_pct: 16, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 12.1 },
    mobile_money: [{ code: "orange_money", name: "Orange Money" }, { code: "moov", name: "Moov Money" }] },
  { code: "ml", name: "Mali", currency: "XOF", flag: "🇲🇱", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 3.6, cnss_employer_pct: 17.4, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "orange_money", name: "Orange Money" }, { code: "moov", name: "Moov Money" }] },
  { code: "bj", name: "Bénin", currency: "XOF", flag: "🇧🇯", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 3.6, cnss_employer_pct: 16.4, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "mtn_momo", name: "MTN MoMo" }, { code: "moov", name: "Moov Money" }] },
  { code: "tg", name: "Togo", currency: "XOF", flag: "🇹🇬", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 4, cnss_employer_pct: 17.5, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "tmoney", name: "T-Money" }, { code: "flooz", name: "Flooz" }] },
  { code: "ne", name: "Niger", currency: "XOF", flag: "🇳🇪", vat: 19, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 5.25, cnss_employer_pct: 15.4, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "orange_money", name: "Orange Money" }, { code: "airtel_money", name: "Airtel Money" }] },
  { code: "gw", name: "Guinée-Bissau", currency: "XOF", flag: "🇬🇼", vat: 17, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 8, cnss_employer_pct: 14, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "orange_money", name: "Orange Money" }] },
  { code: "cm", name: "Cameroun", currency: "XAF", flag: "🇨🇲", vat: 19.25, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 4.2, cnss_employer_pct: 16.2, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "mtn_momo", name: "MTN MoMo" }, { code: "orange_money", name: "Orange Money" }] },
  { code: "ga", name: "Gabon", currency: "XAF", flag: "🇬🇦", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 2.5, cnss_employer_pct: 20.1, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 5 },
    mobile_money: [{ code: "airtel_money", name: "Airtel Money" }, { code: "moov", name: "Moov Money" }] },
  { code: "cg", name: "Congo", currency: "XAF", flag: "🇨🇬", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 4, cnss_employer_pct: 20.28, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "airtel_money", name: "Airtel Money" }, { code: "mtn_momo", name: "MTN MoMo" }] },
  { code: "cd", name: "RD Congo", currency: "CDF", flag: "🇨🇩", vat: 16, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 5, cnss_employer_pct: 13, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 15 },
    mobile_money: [{ code: "orange_money", name: "Orange Money" }, { code: "airtel_money", name: "Airtel Money" }, { code: "mpesa", name: "M-Pesa" }] },
  { code: "td", name: "Tchad", currency: "XAF", flag: "🇹🇩", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 3.5, cnss_employer_pct: 16.5, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "airtel_money", name: "Airtel Money" }, { code: "moov", name: "Moov Money" }] },
  { code: "cf", name: "Centrafrique", currency: "XAF", flag: "🇨🇫", vat: 19, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 3, cnss_employer_pct: 19, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "orange_money", name: "Orange Money" }, { code: "telecel", name: "Telecel Money" }] },
  { code: "gq", name: "Guinée équatoriale", currency: "XAF", flag: "🇬🇶", vat: 15, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 4.5, cnss_employer_pct: 21.5, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "muni", name: "Muni" }] },
  { code: "gn", name: "Guinée", currency: "GNF", flag: "🇬🇳", vat: 18, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 5, cnss_employer_pct: 18, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "orange_money", name: "Orange Money" }, { code: "mtn_momo", name: "MTN MoMo" }] },
  { code: "km", name: "Comores", currency: "KMF", flag: "🇰🇲", vat: 10, service_pct: 10, invoice_prefix: "FAC",
    payroll: { cnss_employee_pct: 2, cnss_employer_pct: 5, ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 10 },
    mobile_money: [{ code: "holo", name: "HOLO" }] },
];

export const getOhadaCountry = (code: string): OhadaCountry | undefined =>
  OHADA_COUNTRIES.find((c) => c.code === code.toLowerCase());