import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string; }

const QUICK_PROMPTS = [
  "Quels plats devrais-je promouvoir ce mois-ci ?",
  "Comment optimiser mon stock ?",
  "Mon restaurant est-il rentable ?",
  "Suggère-moi des actions concrètes pour augmenter mes ventes.",
];

const Advisor = () => {
  const { restaurant } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("restoflow-advisor", {
        body: { messages: newMessages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...newMessages, { role: "assistant", content: data.reply ?? "" }]);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur de l'assistant");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Sparkles className="h-7 w-7 text-primary" /> Conseil RestoFlow
        </h1>
        <p className="mt-1 text-muted-foreground">
          Assistant IA qui analyse les données réelles de {restaurant?.name} pour vous conseiller.
        </p>
      </div>

      <Card className="flex h-[60vh] flex-col shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lightbulb className="h-4 w-4" /> Suggestions pour démarrer :
              </div>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="block w-full rounded-md border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin" /> Analyse en cours…
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Pose ta question…"
              rows={1}
              className="min-h-[40px] resize-none"
            />
            <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Powered by Lovable AI · Gemini 2.5 Flash
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Advisor;