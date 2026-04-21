export interface OrderLineCalc {
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  vat_rate?: number;
}

export interface TotalsInput {
  lines: OrderLineCalc[];
  vatMode: "inclusive" | "exclusive";
  defaultVatRate: number;
  servicePct: number;
  orderDiscountAmount: number;
  tipAmount: number;
}

export interface TotalsResult {
  subtotal: number;        // HT (hors taxes, après remises lignes & commande)
  taxAmount: number;       // TVA totale
  serviceAmount: number;   // service charge
  tipAmount: number;
  discountAmount: number;
  total: number;           // TTC final
}

/**
 * Calculate full order totals with VAT (inclusive or exclusive),
 * line discounts, order-level discount, service charge and tip.
 */
export function computeTotals(input: TotalsInput): TotalsResult {
  const { lines, vatMode, defaultVatRate, servicePct, orderDiscountAmount, tipAmount } = input;

  let netSum = 0;     // somme HT lignes
  let taxSum = 0;     // somme TVA lignes

  for (const l of lines) {
    const gross = l.unit_price * l.quantity - (l.discount_amount ?? 0);
    const rate = (l.vat_rate ?? defaultVatRate) / 100;
    if (vatMode === "inclusive") {
      const net = rate > 0 ? gross / (1 + rate) : gross;
      netSum += net;
      taxSum += gross - net;
    } else {
      netSum += gross;
      taxSum += gross * rate;
    }
  }

  // Apply order-level discount proportionally on net & tax
  const grossSum = netSum + taxSum;
  if (orderDiscountAmount > 0 && grossSum > 0) {
    const ratio = Math.min(1, orderDiscountAmount / grossSum);
    netSum = netSum * (1 - ratio);
    taxSum = taxSum * (1 - ratio);
  }

  const serviceAmount = (netSum + taxSum) * (servicePct / 100);
  const total = netSum + taxSum + serviceAmount + tipAmount;

  return {
    subtotal: round2(netSum),
    taxAmount: round2(taxSum),
    serviceAmount: round2(serviceAmount),
    tipAmount: round2(tipAmount),
    discountAmount: round2(orderDiscountAmount),
    total: round2(total),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}