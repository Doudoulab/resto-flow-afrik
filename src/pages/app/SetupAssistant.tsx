import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wand2, Send, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ToolResult { name: string; ok: boolean; message: string; }
interface Msg { role: "user" | "assistant"; content: string; tools?: ToolResult[]; }

const QUICK_STARTS = [
  "Configure mon resto sénégalais de A à Z",
  "Active Wave, Orange Money et Free Money",
  "Crée le menu : Entrées, Plats, Desserts, Boissons",
  "Paramètre la paie SYSCOHADA Sénégal",
  "Crée les stations cuisine : Chaud, Froid, Bar",
];

const TOOL_LABELS: Record<string, string> = {
  update_restaurant_info: "Infos restaurant",
  configure_payroll: "Paie / SYSCOHADA",
  configure_fiscal: "Fiscal / TVA",
  configure_mobile_money: "Mobile money",
  enable_modules: "Modules",
  create_kitchen_stations: "Stations cuisine",
  create_menu: "Menu",
  create_suppliers: "Fournisseurs",
  create_stock_items: "Stock",
};

const SetupAssistant = () => {
  const { restaurant } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Bonjour 👋 Je suis le Configurateur IA de RestoFlow. Je vais paramétrer ${restaurant?.name ?? "votre restaurant"} pour vous : modules, menu, fournisseurs, stock, mobile money, fiscal, paie… Dites-moi simplement ce que vous voulez configurer, ou cliquez sur une suggestion ci-dessous.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const apiMessages = next.map(({ role, content }) => ({ role, content }));
      const { data, error } = await supabase.functions.invoke("setup-assistant", {
        body: { messages: apiMessages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const tools: ToolResult[] = data?.toolCalls ?? [];
      const reply: string = data?.reply ?? (tools.length ? "✅ Configuration appliquée." : "");
      setMessages([...next, { role: "assistant", content: reply, tools }]);
      if (tools.some((t) => t.ok)) toast.success("Configuration appliquée");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Wand2 className="h-7 w-7 text-primary" /> Configurateur IA
        </h1>
        <p className="mt-1 text-muted-foreground">
          Discute avec l'IA — elle paramètre automatiquement modules, menu, stock, fournisseurs, mobile money, fiscal et paie.
        </p>
      </div>

      <Card className="flex h-[70vh] flex-col shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] space-y-2 rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                {m.tools && m.tools.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {m.tools.map((t, j) => (
                      <div key={j} className="flex items-center gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-xs">
                        {t.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        <Badge variant="secondary" className="text-[10px]">{TOOL_LABELS[t.name] ?? t.name}</Badge>
                        <span className="text-muted-foreground">{t.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin" /> L'IA paramètre votre restaurant…
              </div>
            </div>
          )}
          {messages.length <= 1 && (
            <div className="grid gap-2 pt-4 sm:grid-cols-2">
              {QUICK_STARTS.map((q) => (
                <button key={q} onClick={() => send(q)} className="flex items-start gap-2 rounded-md border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-accent">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ex: Mon resto s'appelle Chez Awa, à Dakar, TVA 18%…"
              rows={1}
              className="min-h-[40px] resize-none"
            />
            <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">L'IA applique directement les changements dans votre restaurant. Powered by Lovable AI.</p>
        </div>
      </Card>
    </div>
  );
};

export default SetupAssistant;