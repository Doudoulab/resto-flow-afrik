// Catalogue statique des opérateurs Mobile Money par pays d'Afrique de l'Ouest et Centrale.
// Les templates utilisent les placeholders {amount}, {number} (numéro marchand configuré).
// USSD: code à composer côté client. Deeplink: lien direct ouvrant l'app de l'opérateur.

export type OperatorCode =
  | "wave"
  | "orange_money"
  | "free_money"
  | "mtn_momo"
  | "moov_money"
  | "airtel_money"
  | "expresso";

export interface OperatorDefinition {
  code: OperatorCode;
  name: string;
  color: string; // tailwind bg class for badge
  // Type d'action déclenchée côté client
  action: "deeplink" | "ussd";
  // Template avec placeholders {amount} {number}
  template: string;
  // Indique si un merchant_id est requis (sinon utilise un numéro)
  needsMerchantId?: boolean;
  helpText?: string;
}

export interface CountryDefinition {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  operators: OperatorDefinition[];
}

const wave = (country: string): OperatorDefinition => ({
  code: "wave",
  name: "Wave",
  color: "bg-[#1DC8FF]",
  action: "deeplink",
  // Si merchant_id renseigné -> QR pay merchant, sinon lien personnel
  template: `https://pay.wave.com/m/{number}/c/${country}?amount={amount}`,
  needsMerchantId: true,
  helpText: "Wave Business : Merchant ID (M_xxxx). Sans Business, mettez votre numéro Wave (+221…) — un lien personnel sera généré.",
});

const orangeMoneySN: OperatorDefinition = {
  code: "orange_money",
  name: "Orange Money",
  color: "bg-[#FF7900]",
  action: "ussd",
  template: "#144#391*{number}*{amount}#",
  helpText: "Numéro Orange Money du commerçant (sans le +).",
};

const orangeMoneyCI: OperatorDefinition = {
  code: "orange_money",
  name: "Orange Money",
  color: "bg-[#FF7900]",
  action: "ussd",
  template: "#144*82*{number}*{amount}#",
};

const orangeMoneyGeneric: OperatorDefinition = {
  code: "orange_money",
  name: "Orange Money",
  color: "bg-[#FF7900]",
  action: "ussd",
  template: "#144#",
  helpText: "Composez puis suivez le menu (Marchand → numéro → montant).",
};

const freeMoneySN: OperatorDefinition = {
  code: "free_money",
  name: "Free Money",
  color: "bg-[#E30613]",
  action: "ussd",
  template: "#150*{number}*{amount}#",
};

const mtnMomo: OperatorDefinition = {
  code: "mtn_momo",
  name: "MTN MoMo",
  color: "bg-[#FFCC00]",
  action: "ussd",
  template: "*133#",
  helpText: "Composez *133# puis suivez : Transfert → Marchand → numéro → montant.",
};

const moovCI: OperatorDefinition = {
  code: "moov_money",
  name: "Moov Money",
  color: "bg-[#0066B3]",
  action: "ussd",
  template: "*155*{number}*{amount}#",
};

const moovGeneric: OperatorDefinition = {
  code: "moov_money",
  name: "Moov Money",
  color: "bg-[#0066B3]",
  action: "ussd",
  template: "*155#",
};

const airtelMoney: OperatorDefinition = {
  code: "airtel_money",
  name: "Airtel Money",
  color: "bg-[#ED1C24]",
  action: "ussd",
  template: "*185#",
};

const expresso: OperatorDefinition = {
  code: "expresso",
  name: "E-Money (Expresso)",
  color: "bg-[#00A859]",
  action: "ussd",
  template: "#737*{number}*{amount}#",
};

export const COUNTRIES: CountryDefinition[] = [
  {
    code: "sn", name: "Sénégal", flag: "🇸🇳", dialCode: "+221",
    operators: [wave("sn"), orangeMoneySN, freeMoneySN, expresso],
  },
  {
    code: "ci", name: "Côte d'Ivoire", flag: "🇨🇮", dialCode: "+225",
    operators: [wave("ci"), orangeMoneyCI, mtnMomo, moovCI],
  },
  {
    code: "ml", name: "Mali", flag: "🇲🇱", dialCode: "+223",
    operators: [wave("ml"), orangeMoneyGeneric, moovGeneric],
  },
  {
    code: "bf", name: "Burkina Faso", flag: "🇧🇫", dialCode: "+226",
    operators: [wave("bf"), orangeMoneyGeneric, moovGeneric],
  },
  {
    code: "bj", name: "Bénin", flag: "🇧🇯", dialCode: "+229",
    operators: [mtnMomo, moovGeneric],
  },
  {
    code: "tg", name: "Togo", flag: "🇹🇬", dialCode: "+228",
    operators: [moovGeneric, { ...mtnMomo, name: "T-Money" }],
  },
  {
    code: "cm", name: "Cameroun", flag: "🇨🇲", dialCode: "+237",
    operators: [mtnMomo, orangeMoneyGeneric],
  },
  {
    code: "gn", name: "Guinée", flag: "🇬🇳", dialCode: "+224",
    operators: [orangeMoneyGeneric, mtnMomo],
  },
  {
    code: "ne", name: "Niger", flag: "🇳🇪", dialCode: "+227",
    operators: [airtelMoney, moovGeneric, orangeMoneyGeneric],
  },
  {
    code: "gm", name: "Gambie", flag: "🇬🇲", dialCode: "+220",
    operators: [wave("gm")],
  },
];

export const getCountry = (code: string | null | undefined): CountryDefinition =>
  COUNTRIES.find((c) => c.code === (code ?? "").toLowerCase()) ?? COUNTRIES[0];

export const getOperatorDef = (countryCode: string, opCode: string): OperatorDefinition | undefined =>
  getCountry(countryCode).operators.find((o) => o.code === opCode);

/**
 * Construit l'URL/USSD à exécuter côté client à partir d'un opérateur configuré.
 * Renvoie { url, kind } où url est utilisable dans <a href> et tel: si USSD.
 */
export const buildPaymentLink = (params: {
  countryCode: string;
  operatorCode: string;
  merchantId?: string | null;
  accountNumber?: string | null;
  amount: number;
  customUssd?: string | null;
  customDeeplink?: string | null;
}): { url: string; kind: "deeplink" | "ussd"; needsManual?: boolean } | null => {
  const def = getOperatorDef(params.countryCode, params.operatorCode);
  if (!def) return null;

  const sub = (tpl: string) =>
    tpl
      .replace(/\{amount\}/g, String(params.amount))
      .replace(/\{number\}/g, (params.accountNumber ?? "").replace(/[\s\-+().]/g, ""))
      .replace(/\{merchant\}/g, (params.merchantId ?? "").trim());

  // 1) Overrides personnalisés saisis par le restaurant : priorité absolue.
  if (params.customDeeplink && params.customDeeplink.trim()) {
    return { url: sub(params.customDeeplink.trim()), kind: "deeplink" };
  }
  if (params.customUssd && params.customUssd.trim()) {
    const ussd = sub(params.customUssd.trim());
    return { url: `tel:${ussd.replace(/#/g, "%23")}`, kind: "ussd" };
  }

  // Wave: si merchant_id, lien marchand. Sinon si numéro, lien personnel.
  if (def.code === "wave") {
    if (params.merchantId && params.merchantId.trim()) {
      const country = (params.countryCode || "sn").toLowerCase();
      return {
        url: `https://pay.wave.com/m/${encodeURIComponent(params.merchantId.trim())}/c/${country}?amount=${params.amount}`,
        kind: "deeplink",
      };
    }
    if (params.accountNumber && params.accountNumber.trim()) {
      let phone = params.accountNumber.replace(/[\s\-().]/g, "");
      if (!phone.startsWith("+")) {
        phone = phone.length === 9 ? `+221${phone}` : `+${phone.replace(/^00/, "")}`;
      }
      return {
        url: `https://pay.wave.com/?phone=${encodeURIComponent(phone)}&amount=${params.amount}`,
        kind: "deeplink",
      };
    }
    return { url: "", kind: "deeplink", needsManual: true };
  }

  // USSD : substitue placeholders
  const number = (params.accountNumber ?? "").replace(/[\s\-+().]/g, "");
  const ussd = def.template
    .replace(/\{amount\}/g, String(params.amount))
    .replace(/\{number\}/g, number);
  // tel: requires # encoded as %23
  const url = `tel:${ussd.replace(/#/g, "%23")}`;
  return { url, kind: "ussd", needsManual: !number && def.template.includes("{number}") };
};