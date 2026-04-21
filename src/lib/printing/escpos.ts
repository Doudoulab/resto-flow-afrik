// Minimal ESC/POS command builder (no external dep, UTF-8 + CP437 fallback)
const ESC = 0x1b, GS = 0x1d, LF = 0x0a;

export class EscPos {
  private buf: number[] = [];

  raw(...b: number[]) { this.buf.push(...b); return this; }
  init() { return this.raw(ESC, 0x40); }
  text(s: string) {
    const bytes = new TextEncoder().encode(s);
    this.buf.push(...bytes); return this;
  }
  line(s = "") { return this.text(s).raw(LF); }
  feed(n = 1) { return this.raw(ESC, 0x64, n); }
  align(a: "left" | "center" | "right") {
    return this.raw(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
  }
  bold(on: boolean) { return this.raw(ESC, 0x45, on ? 1 : 0); }
  underline(on: boolean) { return this.raw(ESC, 0x2d, on ? 1 : 0); }
  size(w: 1 | 2 | 3 = 1, h: 1 | 2 | 3 = 1) {
    const v = ((w - 1) << 4) | (h - 1);
    return this.raw(GS, 0x21, v);
  }
  cut(partial = false) { return this.raw(GS, 0x56, partial ? 1 : 0); }
  drawerKick() { return this.raw(ESC, 0x70, 0x00, 0x19, 0xfa); }
  hr(width = 32) { return this.line("-".repeat(width)); }
  twoCol(left: string, right: string, width = 32) {
    const space = Math.max(1, width - left.length - right.length);
    return this.line(left + " ".repeat(space) + right);
  }
  bytes(): Uint8Array { return new Uint8Array(this.buf); }
}

export const buildKitchenTicket = (opts: {
  restaurantName: string; orderNumber: string | number; tableLabel?: string;
  station?: string; waiter?: string; items: { qty: number; name: string; note?: string; allergy?: boolean }[];
  width?: number;
}) => {
  const w = opts.width ?? 32;
  const e = new EscPos().init().align("center").bold(true).size(2, 2)
    .line(opts.station || "CUISINE").size(1, 1).bold(false)
    .line(opts.restaurantName).hr(w).align("left").bold(true)
    .twoCol(`#${opts.orderNumber}`, opts.tableLabel ? `Table ${opts.tableLabel}` : "", w);
  if (opts.waiter) e.line(`Serveur: ${opts.waiter}`);
  e.line(new Date().toLocaleString("fr-FR")).hr(w).bold(false);
  for (const it of opts.items) {
    e.bold(true).size(1, 2).line(`${it.qty}x ${it.name}`).size(1, 1).bold(false);
    if (it.allergy) e.underline(true).line("** ALLERGIE **").underline(false);
    if (it.note) e.line(`  > ${it.note}`);
  }
  return e.hr(w).feed(3).cut().bytes();
};

export const buildReceipt = (opts: {
  restaurantName: string; address?: string; phone?: string; taxId?: string;
  invoiceNumber: string; issuedAt: Date;
  items: { qty: number; name: string; price: number; total: number }[];
  subtotal: number; discount?: number; service?: number; tax?: number; tip?: number; total: number;
  currency: string; paymentMethod?: string; footer?: string; openDrawer?: boolean; width?: number;
}) => {
  const w = opts.width ?? 32;
  const fmt = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${opts.currency}`;
  const e = new EscPos().init().align("center").bold(true).size(2, 2).line(opts.restaurantName)
    .size(1, 1).bold(false);
  if (opts.address) e.line(opts.address);
  if (opts.phone) e.line(`Tél: ${opts.phone}`);
  if (opts.taxId) e.line(`NINEA/RC: ${opts.taxId}`);
  e.hr(w).align("left").twoCol("Facture", opts.invoiceNumber, w)
    .twoCol("Date", opts.issuedAt.toLocaleString("fr-FR"), w).hr(w);
  for (const it of opts.items) {
    e.line(`${it.qty}x ${it.name}`).twoCol(`  @ ${fmt(it.price)}`, fmt(it.total), w);
  }
  e.hr(w).twoCol("Sous-total", fmt(opts.subtotal), w);
  if (opts.discount) e.twoCol("Remise", `-${fmt(opts.discount)}`, w);
  if (opts.service) e.twoCol("Service", fmt(opts.service), w);
  if (opts.tax) e.twoCol("TVA", fmt(opts.tax), w);
  if (opts.tip) e.twoCol("Pourboire", fmt(opts.tip), w);
  e.bold(true).size(1, 2).twoCol("TOTAL", fmt(opts.total), w).size(1, 1).bold(false);
  if (opts.paymentMethod) e.line(`Paiement: ${opts.paymentMethod}`);
  e.hr(w).align("center");
  if (opts.footer) e.line(opts.footer);
  e.line("Merci de votre visite !").feed(3).cut();
  if (opts.openDrawer) e.drawerKick();
  return e.bytes();
};