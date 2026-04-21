import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const fr = {
  common: {
    save: "Enregistrer", cancel: "Annuler", delete: "Supprimer", edit: "Modifier",
    add: "Ajouter", search: "Rechercher", loading: "Chargement…", confirm: "Confirmer",
    yes: "Oui", no: "Non", close: "Fermer", language: "Langue",
  },
  nav: {
    dashboard: "Tableau de bord", orders: "Commandes", kitchen: "Écran cuisine",
    floor: "Salle", menu: "Menu", stock: "Stock", staff: "Équipe",
    settings: "Paramètres", security: "Sécurité", backups: "Sauvegardes",
    health: "État système", printers: "Imprimantes", fiscal: "Vérification fiscale",
  },
  fiscal: {
    title: "Vérification de la chaîne fiscale",
    description: "Contrôle SHA-256 de l'intégrité des factures",
    verify: "Vérifier la chaîne", verified: "Chaîne intègre",
    broken: "Chaîne corrompue", invoices_checked: "Factures vérifiées",
    download_pdf: "Télécharger PDF",
  },
};

const en = {
  common: {
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit",
    add: "Add", search: "Search", loading: "Loading…", confirm: "Confirm",
    yes: "Yes", no: "No", close: "Close", language: "Language",
  },
  nav: {
    dashboard: "Dashboard", orders: "Orders", kitchen: "Kitchen display",
    floor: "Floor", menu: "Menu", stock: "Stock", staff: "Staff",
    settings: "Settings", security: "Security", backups: "Backups",
    health: "System health", printers: "Printers", fiscal: "Fiscal verification",
  },
  fiscal: {
    title: "Fiscal chain verification",
    description: "SHA-256 integrity check of invoices",
    verify: "Verify chain", verified: "Chain intact",
    broken: "Chain corrupted", invoices_checked: "Invoices checked",
    download_pdf: "Download PDF",
  },
};

const ar = {
  common: {
    save: "حفظ", cancel: "إلغاء", delete: "حذف", edit: "تعديل",
    add: "إضافة", search: "بحث", loading: "جارٍ التحميل…", confirm: "تأكيد",
    yes: "نعم", no: "لا", close: "إغلاق", language: "اللغة",
  },
  nav: {
    dashboard: "لوحة التحكم", orders: "الطلبات", kitchen: "شاشة المطبخ",
    floor: "القاعة", menu: "القائمة", stock: "المخزون", staff: "الفريق",
    settings: "الإعدادات", security: "الأمان", backups: "النسخ الاحتياطية",
    health: "حالة النظام", printers: "الطابعات", fiscal: "التحقق الضريبي",
  },
  fiscal: {
    title: "التحقق من السلسلة الضريبية",
    description: "فحص سلامة الفواتير عبر SHA-256",
    verify: "تحقق من السلسلة", verified: "السلسلة سليمة",
    broken: "السلسلة معطوبة", invoices_checked: "الفواتير المفحوصة",
    download_pdf: "تحميل PDF",
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } },
    fallbackLng: "fr",
    supportedLngs: ["fr", "en", "ar"],
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  });

const applyDir = (lng: string) => {
  const dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
};
applyDir(i18n.language || "fr");
i18n.on("languageChanged", applyDir);

export default i18n;