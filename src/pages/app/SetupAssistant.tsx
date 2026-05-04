import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, ChevronLeft, ChevronRight, Loader2, Sparkles, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OHADA_COUNTRIES, getOhadaCountry } from "@/lib/ohada/countries";

type StepKey = "country" | "info" | "fiscal" | "mobile_money" | "payroll" | "modules" | "stations" | "menu" | "suppliers" | "stock" | "done";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "country", label: "Pays OHADA" },
  { key: "info", label: "Restaurant" },
  { key: "fiscal", label: "Fiscal / TVA" },
  { key: "mobile_money", label: "Mobile money" },
  { key: "payroll", label: "Paie SYSCOHADA" },
  { key: "modules", label: "Modules" },
  { key: "stations", label: "Stations cuisine" },
  { key: "menu", label: "Menu" },
  { key: "suppliers", label: "Fournisseurs" },
  { key: "stock", label: "Stock" },
  { key: "done", label: "Terminé" },
];

const ALL_MODULES = [
  "kitchen","printers","incoming","reports","accounting","customers","suppliers","receipts",
  "inventory","timeclock","payroll","wines","tasting","gueridon","pms","menu_engineering",
  "analytics","advisor","audit","security","backups","fiscal","exports",
];

const SetupAssistant = () => {
  const { restaurant, refreshRestaurant } = useAuth() as any;
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  // Form state per step
  const [country, setCountry] = useState<string>(restaurant?.country_code || "sn");
  const [cuisine, setCuisine] = useState<string>("");

  const [info, setInfo] = useState({
    name: restaurant?.name || "",
    description: restaurant?.description || "",
    address: restaurant?.address || "",
    phone: restaurant?.phone || "",
    whatsapp: restaurant?.whatsapp || "",
    instagram_url: restaurant?.instagram_url || "",
    facebook_url: restaurant?.facebook_url || "",
    theme_color: restaurant?.theme_color || "#16a34a",
  });

  const ohada = useMemo(() => getOhadaCountry(country), [country]);

  const [fiscal, setFiscal] = useState({
    default_vat_rate: 18,
    vat_mode: "exclusive" as "exclusive" | "inclusive",
    invoice_prefix: "FAC",
    default_service_pct: 0,
    tax_id: "",
  });
  const [payroll, setPayroll] = useState({
    cnss_employee_pct: 0, cnss_employer_pct: 0,
    ipres_employee_pct: 0, ipres_employer_pct: 0, irpp_pct: 0,
  });
  const [operators, setOperators] = useState<Array<{ operator_code: string; display_name: string; account_number: string; enabled: boolean }>>([]);
  const [modules, setModules] = useState<string[]>(restaurant?.enabled_modules || []);
  const [stations, setStations] = useState<Array<{ name: string; color: string }>>([]);
  const [menuCats, setMenuCats] = useState<Array<{ name: string; items: Array<{ name: string; price: number; description?: string }> }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ name: string; contact_name?: string; phone?: string; notes?: string }>>([]);
  const [stock, setStock] = useState<Array<{ name: string; unit: string; quantity: number; alert_threshold: number; cost_per_unit: number }>>([]);

  // Re-applique les défauts pays quand on change country
  useEffect(() => {
    if (!ohada) return;
    setFiscal((f) => ({ ...f, default_vat_rate: ohada.vat, default_service_pct: ohada.service_pct, invoice_prefix: ohada.invoice_prefix }));
    setPayroll(ohada.payroll);
    setOperators(ohada.mobile_money.map((m) => ({ operator_code: m.code, display_name: m.name, account_number: "", enabled: true })));
  }, [country, ohada]);

  const step = STEPS[stepIdx];
  const next = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  const prev = () => setStepIdx((i) => Math.max(i - 1, 0));

  const apply = async (stepKey: string, payload: any) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("setup-assistant", { body: { action: "apply", step: stepKey, payload } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Erreur");
      toast.success(data.message || "Enregistré");
      setDone((d) => ({ ...d, [stepKey]: true }));
      if (stepKey === "info" || stepKey === "fiscal") await refreshRestaurant?.();
      next();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const askAI = async (suggestStep: string, prompt?: string) => {
    if (!ohada) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("setup-assistant", {
        body: { action: "suggest", step: suggestStep, country: ohada.name, currency: ohada.currency, cuisine, prompt },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Erreur IA");
      const s = data.suggestion ?? {};
      if (suggestStep === "menu" && Array.isArray(s.categories)) setMenuCats(s.categories);
      if (suggestStep === "stations" && Array.isArray(s.stations)) setStations(s.stations);
      if (suggestStep === "stock" && Array.isArray(s.items)) setStock(s.items);
      if (suggestStep === "suppliers" && Array.isArray(s.suppliers)) setSuppliers(s.suppliers);
      if (suggestStep === "modules" && Array.isArray(s.modules)) {
        setModules(Array.from(new Set([...modules, ...s.modules])));
        if (s.rationale) toast.info(s.rationale);
      }
      toast.success("Suggestions IA chargées — modifiez puis validez");
    } catch (e: any) {
      toast.error(e.message || "Erreur IA");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Wand2 className="h-7 w-7 text-primary" /> Configurateur IA
        </h1>
        <p className="mt-1 text-muted-foreground">
          Wizard guidé : à chaque étape, l'IA propose des valeurs adaptées à votre pays OHADA. Vous validez le formulaire et on enregistre.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setStepIdx(i)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  i === stepIdx ? "border-primary bg-primary text-primary-foreground" :
                  done[s.key] ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400" :
                  "border-border bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {done[s.key] && <CheckCircle2 className="h-3 w-3" />}
                <span>{i + 1}. {s.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Étape {stepIdx + 1} / {STEPS.length} — {step.label}
          </CardTitle>
          {ohada && stepIdx > 0 && (
            <Badge variant="secondary" className="text-xs">{ohada.flag} {ohada.name} · {ohada.currency}</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {step.key === "country" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Sélectionnez le pays OHADA de votre restaurant. Tous les paramétrages suivants (TVA, paie, mobile money) seront pré-remplis selon ce choix.</p>
              <div className="space-y-2">
                <Label>Pays</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {OHADA_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} — {c.currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de cuisine (optionnel — aide l'IA pour le menu)</Label>
                <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="ex: Sénégalaise traditionnelle, Pizzeria, Fast-food, Fusion…" />
              </div>
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                <strong>Défauts pour {ohada?.name}:</strong> TVA {ohada?.vat}%, service {ohada?.service_pct}%, CNSS employeur {ohada?.payroll.cnss_employer_pct}%, mobile money: {ohada?.mobile_money.map((m) => m.name).join(", ")}.
              </div>
              <div className="flex justify-end">
                <Button onClick={() => apply("country", { country_code: country, currency: ohada?.currency })} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Continuer <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step.key === "info" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom du restaurant"><Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></Field>
                <Field label="Téléphone"><Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></Field>
                <Field label="WhatsApp"><Input value={info.whatsapp} onChange={(e) => setInfo({ ...info, whatsapp: e.target.value })} /></Field>
                <Field label="Couleur thème"><Input type="color" value={info.theme_color} onChange={(e) => setInfo({ ...info, theme_color: e.target.value })} /></Field>
                <Field label="Instagram"><Input value={info.instagram_url} onChange={(e) => setInfo({ ...info, instagram_url: e.target.value })} placeholder="https://instagram.com/..." /></Field>
                <Field label="Facebook"><Input value={info.facebook_url} onChange={(e) => setInfo({ ...info, facebook_url: e.target.value })} placeholder="https://facebook.com/..." /></Field>
              </div>
              <Field label="Adresse"><Input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} /></Field>
              <Field label="Description"><Textarea value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} rows={3} /></Field>
              <Nav onPrev={prev} onNext={() => apply("info", info)} busy={busy} />
            </div>
          )}

          {step.key === "fiscal" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Valeurs pré-remplies pour {ohada?.name}. Ajustez si besoin.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="TVA standard (%)"><Input type="number" step="0.01" value={fiscal.default_vat_rate} onChange={(e) => setFiscal({ ...fiscal, default_vat_rate: parseFloat(e.target.value) || 0 })} /></Field>
                <Field label="Mode TVA">
                  <Select value={fiscal.vat_mode} onValueChange={(v: any) => setFiscal({ ...fiscal, vat_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">Hors TVA (HT)</SelectItem>
                      <SelectItem value="inclusive">TVA incluse (TTC)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Préfixe facture"><Input value={fiscal.invoice_prefix} onChange={(e) => setFiscal({ ...fiscal, invoice_prefix: e.target.value })} /></Field>
                <Field label="Service (%)"><Input type="number" step="0.5" value={fiscal.default_service_pct} onChange={(e) => setFiscal({ ...fiscal, default_service_pct: parseFloat(e.target.value) || 0 })} /></Field>
                <Field label="N° identifiant fiscal (NINEA, RCCM…)"><Input value={fiscal.tax_id} onChange={(e) => setFiscal({ ...fiscal, tax_id: e.target.value })} /></Field>
              </div>
              <Nav onPrev={prev} onNext={() => apply("fiscal", fiscal)} busy={busy} />
            </div>
          )}

          {step.key === "mobile_money" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Opérateurs disponibles dans {ohada?.name}. Renseignez vos numéros marchands.</p>
              {operators.map((op, i) => (
                <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-12">
                  <div className="sm:col-span-1 flex items-center"><Checkbox checked={op.enabled} onCheckedChange={(v) => updateAt(operators, setOperators, i, { enabled: !!v })} /></div>
                  <div className="sm:col-span-3"><Input value={op.display_name} onChange={(e) => updateAt(operators, setOperators, i, { display_name: e.target.value })} /></div>
                  <div className="sm:col-span-7"><Input placeholder="Numéro / Merchant ID" value={op.account_number} onChange={(e) => updateAt(operators, setOperators, i, { account_number: e.target.value })} /></div>
                  <div className="sm:col-span-1 flex items-center justify-end"><Button size="icon" variant="ghost" onClick={() => setOperators(operators.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setOperators([...operators, { operator_code: "custom", display_name: "", account_number: "", enabled: true }])}>
                <Plus className="mr-1 h-3 w-3" /> Ajouter un opérateur
              </Button>
              <Nav onPrev={prev} onNext={() => apply("mobile_money", { operators })} busy={busy} />
            </div>
          )}

          {step.key === "payroll" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Taux SYSCOHADA pour {ohada?.name}. Vérifiez avec votre comptable.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="CNSS salarié (%)"><Input type="number" step="0.1" value={payroll.cnss_employee_pct} onChange={(e) => setPayroll({ ...payroll, cnss_employee_pct: parseFloat(e.target.value) || 0 })} /></Field>
                <Field label="CNSS employeur (%)"><Input type="number" step="0.1" value={payroll.cnss_employer_pct} onChange={(e) => setPayroll({ ...payroll, cnss_employer_pct: parseFloat(e.target.value) || 0 })} /></Field>
                <Field label="IPRES / Retraite salarié (%)"><Input type="number" step="0.1" value={payroll.ipres_employee_pct} onChange={(e) => setPayroll({ ...payroll, ipres_employee_pct: parseFloat(e.target.value) || 0 })} /></Field>
                <Field label="IPRES / Retraite employeur (%)"><Input type="number" step="0.1" value={payroll.ipres_employer_pct} onChange={(e) => setPayroll({ ...payroll, ipres_employer_pct: parseFloat(e.target.value) || 0 })} /></Field>
                <Field label="IRPP (%)"><Input type="number" step="0.1" value={payroll.irpp_pct} onChange={(e) => setPayroll({ ...payroll, irpp_pct: parseFloat(e.target.value) || 0 })} /></Field>
              </div>
              <Nav onPrev={prev} onNext={() => apply("payroll", { country_code: country, ...payroll })} busy={busy} />
            </div>
          )}

          {step.key === "modules" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Activez les modules dont vous avez besoin.</p>
                <AIButton onClick={() => askAI("modules")} busy={aiBusy} label="L'IA recommande" />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {ALL_MODULES.map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent">
                    <Checkbox checked={modules.includes(m)} onCheckedChange={(v) => setModules(v ? [...modules, m] : modules.filter((x) => x !== m))} />
                    <span className="capitalize">{m.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
              <Nav onPrev={prev} onNext={() => apply("modules", { modules })} busy={busy} />
            </div>
          )}

          {step.key === "stations" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Stations cuisine pour le KDS.</p>
                <AIButton onClick={() => askAI("stations")} busy={aiBusy} label="Suggérer avec l'IA" />
              </div>
              {stations.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="flex-1" value={s.name} onChange={(e) => updateAt(stations, setStations, i, { name: e.target.value })} />
                  <Input type="color" className="w-16" value={s.color || "#64748b"} onChange={(e) => updateAt(stations, setStations, i, { color: e.target.value })} />
                  <Button size="icon" variant="ghost" onClick={() => setStations(stations.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setStations([...stations, { name: "", color: "#64748b" }])}><Plus className="mr-1 h-3 w-3" /> Ajouter</Button>
              <Nav onPrev={prev} onNext={() => apply("stations", { stations })} busy={busy} skipLabel="Passer" onSkip={next} />
            </div>
          )}

          {step.key === "menu" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Catégories et plats. L'IA peut générer un menu typique.</p>
                <AIButton onClick={() => askAI("menu")} busy={aiBusy} label="Générer un menu" />
              </div>
              {menuCats.map((cat, ci) => (
                <div key={ci} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input className="flex-1 font-medium" value={cat.name} onChange={(e) => updateAt(menuCats, setMenuCats, ci, { name: e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={() => setMenuCats(menuCats.filter((_, j) => j !== ci))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {cat.items.map((it, ii) => (
                    <div key={ii} className="grid gap-2 sm:grid-cols-12">
                      <Input className="sm:col-span-5" placeholder="Plat" value={it.name} onChange={(e) => updateMenuItem(menuCats, setMenuCats, ci, ii, { name: e.target.value })} />
                      <Input className="sm:col-span-2" type="number" placeholder="Prix" value={it.price} onChange={(e) => updateMenuItem(menuCats, setMenuCats, ci, ii, { price: parseFloat(e.target.value) || 0 })} />
                      <Input className="sm:col-span-4" placeholder="Description" value={it.description || ""} onChange={(e) => updateMenuItem(menuCats, setMenuCats, ci, ii, { description: e.target.value })} />
                      <Button className="sm:col-span-1" size="icon" variant="ghost" onClick={() => updateAt(menuCats, setMenuCats, ci, { items: cat.items.filter((_, j) => j !== ii) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => updateAt(menuCats, setMenuCats, ci, { items: [...cat.items, { name: "", price: 0 }] })}><Plus className="mr-1 h-3 w-3" /> Plat</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setMenuCats([...menuCats, { name: "", items: [] }])}><Plus className="mr-1 h-3 w-3" /> Catégorie</Button>
              <Nav onPrev={prev} onNext={() => apply("menu", { categories: menuCats })} busy={busy} skipLabel="Passer" onSkip={next} />
            </div>
          )}

          {step.key === "suppliers" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Fournisseurs habituels.</p>
                <AIButton onClick={() => askAI("suppliers")} busy={aiBusy} label="Suggérer avec l'IA" />
              </div>
              {suppliers.map((s, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-12">
                  <Input className="sm:col-span-4" placeholder="Nom" value={s.name} onChange={(e) => updateAt(suppliers, setSuppliers, i, { name: e.target.value })} />
                  <Input className="sm:col-span-3" placeholder="Contact" value={s.contact_name || ""} onChange={(e) => updateAt(suppliers, setSuppliers, i, { contact_name: e.target.value })} />
                  <Input className="sm:col-span-2" placeholder="Tél" value={s.phone || ""} onChange={(e) => updateAt(suppliers, setSuppliers, i, { phone: e.target.value })} />
                  <Input className="sm:col-span-2" placeholder="Notes" value={s.notes || ""} onChange={(e) => updateAt(suppliers, setSuppliers, i, { notes: e.target.value })} />
                  <Button className="sm:col-span-1" size="icon" variant="ghost" onClick={() => setSuppliers(suppliers.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setSuppliers([...suppliers, { name: "" }])}><Plus className="mr-1 h-3 w-3" /> Ajouter</Button>
              <Nav onPrev={prev} onNext={() => apply("suppliers", { suppliers })} busy={busy} skipLabel="Passer" onSkip={next} />
            </div>
          )}

          {step.key === "stock" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Articles d'inventaire.</p>
                <AIButton onClick={() => askAI("stock")} busy={aiBusy} label="Générer un stock de base" />
              </div>
              {stock.map((s, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-12">
                  <Input className="sm:col-span-4" placeholder="Article" value={s.name} onChange={(e) => updateAt(stock, setStock, i, { name: e.target.value })} />
                  <Input className="sm:col-span-2" placeholder="Unité" value={s.unit} onChange={(e) => updateAt(stock, setStock, i, { unit: e.target.value })} />
                  <Input className="sm:col-span-2" type="number" placeholder="Qté" value={s.quantity} onChange={(e) => updateAt(stock, setStock, i, { quantity: parseFloat(e.target.value) || 0 })} />
                  <Input className="sm:col-span-1" type="number" placeholder="Alerte" value={s.alert_threshold} onChange={(e) => updateAt(stock, setStock, i, { alert_threshold: parseFloat(e.target.value) || 0 })} />
                  <Input className="sm:col-span-2" type="number" placeholder="Coût" value={s.cost_per_unit} onChange={(e) => updateAt(stock, setStock, i, { cost_per_unit: parseFloat(e.target.value) || 0 })} />
                  <Button className="sm:col-span-1" size="icon" variant="ghost" onClick={() => setStock(stock.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setStock([...stock, { name: "", unit: "kg", quantity: 0, alert_threshold: 0, cost_per_unit: 0 }])}><Plus className="mr-1 h-3 w-3" /> Ajouter</Button>
              <Nav onPrev={prev} onNext={() => apply("stock", { items: stock })} busy={busy} skipLabel="Passer" onSkip={next} />
            </div>
          )}

          {step.key === "done" && (
            <div className="space-y-3 py-6 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold">Configuration terminée 🎉</h2>
              <p className="text-muted-foreground">Votre restaurant est prêt. Vous pouvez ajuster chaque section depuis le menu Configuration.</p>
              <Button onClick={() => setStepIdx(0)} variant="outline">Recommencer</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
);

const Nav = ({ onPrev, onNext, busy, skipLabel, onSkip }: { onPrev: () => void; onNext: () => void; busy: boolean; skipLabel?: string; onSkip?: () => void }) => (
  <div className="flex items-center justify-between border-t pt-3">
    <Button variant="ghost" onClick={onPrev}><ChevronLeft className="mr-1 h-4 w-4" /> Retour</Button>
    <div className="flex gap-2">
      {skipLabel && onSkip && <Button variant="ghost" onClick={onSkip}>{skipLabel}</Button>}
      <Button onClick={onNext} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Enregistrer & continuer <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  </div>
);

const AIButton = ({ onClick, busy, label }: { onClick: () => void; busy: boolean; label: string }) => (
  <Button size="sm" variant="outline" onClick={onClick} disabled={busy} className="gap-1">
    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
    {label}
  </Button>
);

function updateAt<T>(arr: T[], set: (v: T[]) => void, i: number, patch: Partial<T>) {
  const next = [...arr]; next[i] = { ...next[i], ...patch }; set(next);
}
function updateMenuItem(cats: any[], set: (v: any[]) => void, ci: number, ii: number, patch: any) {
  const next = [...cats]; const items = [...next[ci].items]; items[ii] = { ...items[ii], ...patch }; next[ci] = { ...next[ci], items }; set(next);
}

export default SetupAssistant;