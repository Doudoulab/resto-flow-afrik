import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Loader2, FileDown } from "lucide-react";
import { verifyInvoiceChain, type ChainCheckResult } from "@/lib/fiscal/chainVerify";
import { supabase } from "@/integrations/supabase/client";
import { downloadInvoicePDF } from "@/lib/invoices/pdf";
import { toast } from "sonner";

export default function Fiscal() {
  const { t } = useTranslation();
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChainCheckResult | null>(null);

  const run = async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const r = await verifyInvoiceChain(restaurant.id);
      setResult(r);
      if (r.broken.length === 0) toast.success(t("fiscal.verified"));
      else toast.error(`${t("fiscal.broken")}: ${r.broken.length}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportLatest = async () => {
    if (!restaurant) return;
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) { toast.error("Aucune facture"); return; }
    downloadInvoicePDF(data as any);
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">{t("fiscal.title")}</h1>
        <p className="text-muted-foreground">{t("fiscal.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> {t("fiscal.verify")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              {t("fiscal.verify")}
            </Button>
            <Button variant="outline" onClick={exportLatest}>
              <FileDown className="h-4 w-4 mr-2" /> {t("fiscal.download_pdf")}
            </Button>
          </div>

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant={result.broken.length === 0 ? "default" : "destructive"}>
                  {result.broken.length === 0 ? t("fiscal.verified") : t("fiscal.broken")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {result.ok}/{result.total} {t("fiscal.invoices_checked")}
                </span>
              </div>
              {result.broken.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-1">
                  {result.broken.map((b) => (
                    <div key={b.invoice_number} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-mono">{b.invoice_number}</span>
                      <span className="text-muted-foreground">— {b.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}