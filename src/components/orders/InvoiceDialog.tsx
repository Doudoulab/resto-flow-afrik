import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import { Loader2, Printer } from "lucide-react";
import { PrintStyles } from "@/components/print/PrintStyles";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  restaurantId: string | null;
}

interface InvoiceData {
  invoice_number: string;
  issued_at: string;
  subtotal: number;
  tax_amount: number;
  service_amount: number;
  tip_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  legal_footer: string | null;
  customer_name: string | null;
  restaurant_snapshot: { name?: string; address?: string; phone?: string; tax_id?: string; business_register?: string };
  items_snapshot: { name_snapshot: string; quantity: number; unit_price: number; vat_rate?: number }[];
}

export const InvoiceDialog = ({ open, onOpenChange, orderId, restaurantId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !orderId || !restaurantId) return;
    (async () => {
      setLoading(true);
      // Check if order already has an invoice
      const { data: ord } = await supabase.from("orders")
        .select("invoice_id").eq("id", orderId).maybeSingle();

      if (ord?.invoice_id) {
        const { data } = await supabase.from("invoices").select("*").eq("id", ord.invoice_id).maybeSingle();
        setInvoice(data as never);
        setLoading(false);
        return;
      }

      // Generate new invoice
      const [{ data: order }, { data: items }, { data: resto }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("restaurants").select("name, address, phone, tax_id, business_register, invoice_footer, currency").eq("id", restaurantId).maybeSingle(),
      ]);
      if (!order || !resto) { setLoading(false); toast.error("Données introuvables"); return; }

      const { data: numData, error: numErr } = await supabase.rpc("next_invoice_number", { _restaurant_id: restaurantId });
      if (numErr) { setLoading(false); toast.error(numErr.message); return; }

      const invNumber = numData as unknown as string;
      const restoSnap = {
        name: resto.name, address: resto.address, phone: resto.phone,
        tax_id: resto.tax_id, business_register: resto.business_register,
      };
      const itemsSnap = (items ?? []).filter((i) => i.status !== "cancelled").map((i) => ({
        name_snapshot: i.name_snapshot, quantity: i.quantity,
        unit_price: Number(i.unit_price), vat_rate: Number(i.vat_rate ?? 0),
      }));

      const { data: inv, error: invErr } = await supabase.from("invoices").insert({
        restaurant_id: restaurantId,
        order_id: orderId,
        invoice_number: invNumber,
        subtotal: Number(order.subtotal),
        tax_amount: Number(order.tax_amount),
        service_amount: Number(order.service_amount),
        tip_amount: Number(order.tip_amount),
        discount_amount: Number(order.discount_amount),
        total: Number(order.total),
        currency: resto.currency ?? "FCFA",
        legal_footer: resto.invoice_footer,
        restaurant_snapshot: restoSnap as never,
        items_snapshot: itemsSnap as never,
      }).select().single();
      if (invErr) { setLoading(false); toast.error(invErr.message); return; }

      await supabase.from("orders").update({ invoice_id: inv.id, invoice_number: invNumber }).eq("id", orderId);
      setInvoice(inv as never);
      setLoading(false);
      toast.success(`Facture ${invNumber} émise`);
    })();
  }, [open, orderId, restaurantId]);

  const doPrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Facture légale</DialogTitle></DialogHeader>
        {loading || !invoice ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <PrintStyles />
            <div ref={printRef} className="invoice-print bg-card text-card-foreground p-6 rounded-md border">
              <div className="flex justify-between border-b pb-3 mb-3">
                <div>
                  <h2 className="text-xl font-bold">{invoice.restaurant_snapshot.name}</h2>
                  {invoice.restaurant_snapshot.address && <p className="text-sm text-muted-foreground">{invoice.restaurant_snapshot.address}</p>}
                  {invoice.restaurant_snapshot.phone && <p className="text-sm text-muted-foreground">{invoice.restaurant_snapshot.phone}</p>}
                  {invoice.restaurant_snapshot.tax_id && <p className="text-xs">NIF : {invoice.restaurant_snapshot.tax_id}</p>}
                  {invoice.restaurant_snapshot.business_register && <p className="text-xs">RCCM : {invoice.restaurant_snapshot.business_register}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">FACTURE</p>
                  <p className="font-mono text-lg">{invoice.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(invoice.issued_at).toLocaleString("fr-FR")}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-1">Désignation</th>
                    <th className="text-right">Qté</th>
                    <th className="text-right">PU</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items_snapshot.map((it, i) => (
                    <tr key={i} className="border-b border-dashed">
                      <td className="py-1">{it.name_snapshot}</td>
                      <td className="text-right">{it.quantity}</td>
                      <td className="text-right">{formatFCFA(it.unit_price)}</td>
                      <td className="text-right">{formatFCFA(it.unit_price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 ml-auto w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><span>Sous-total HT</span><span>{formatFCFA(invoice.subtotal)}</span></div>
                {invoice.discount_amount > 0 && <div className="flex justify-between text-destructive"><span>Remise</span><span>−{formatFCFA(invoice.discount_amount)}</span></div>}
                <div className="flex justify-between"><span>TVA</span><span>{formatFCFA(invoice.tax_amount)}</span></div>
                {invoice.service_amount > 0 && <div className="flex justify-between"><span>Service</span><span>{formatFCFA(invoice.service_amount)}</span></div>}
                {invoice.tip_amount > 0 && <div className="flex justify-between"><span>Pourboire</span><span>{formatFCFA(invoice.tip_amount)}</span></div>}
                <div className="flex justify-between border-t pt-1 font-bold text-base"><span>TOTAL TTC</span><span>{formatFCFA(invoice.total)}</span></div>
              </div>
              {invoice.legal_footer && (
                <p className="mt-4 border-t pt-2 text-xs text-muted-foreground whitespace-pre-line">{invoice.legal_footer}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
              <Button onClick={doPrint}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};