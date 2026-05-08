import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Lightbulb, Plus, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Msg { role: "user" | "assistant"; content: string; }
interface Conv { id: string; title: string; updated_at: string; }

const QUICK_PROMPTS = [
  "Quels plats devrais-je promouvoir ce mois-ci ?",
  "Comment optimiser mon stock ?",
  "Mon restaurant est-il rentable ?",
  "Suggère-moi des actions concrètes pour augmenter mes ventes.",
];

const Advisor = () => {
  const { restaurant } = useAuth();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void loadConversations(); }, [restaurant?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!restaurant?.id) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .eq("restaurant_id", restaurant.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    setConversations(data ?? []);
  };

  const openConversation = async (id: string) => {
    setActiveId(id);
    setLoadingHistory(true);
    const { data } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages((data ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    setLoadingHistory(false);
  };

  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Supprimer cette conversation ?")) return;
    const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (activeId === id) newConversation();
    void loadConversations();
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("restoflow-advisor", {
        body: { messages: newMessages, conversationId: activeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...newMessages, { role: "assistant", content: data.reply ?? "" }]);
      if (data.conversationId && data.conversationId !== activeId) {
        setActiveId(data.conversationId);
      }
      void loadConversations();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur de l'assistant");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Sparkles className="h-7 w-7 text-primary" /> Conseil RestoFlow
        </h1>
        <p className="mt-1 text-muted-foreground">
          Assistant IA qui analyse les données réelles de {restaurant?.name} pour vous conseiller.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Sidebar conversations */}
        <Card className="flex h-[60vh] flex-col p-3">
          <Button onClick={newConversation} variant="outline" size="sm" className="mb-3 w-full justify-start gap-2">
            <Plus className="h-4 w-4" /> Nouvelle conversation
          </Button>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">Aucune conversation</p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent ${
                  activeId === c.id ? "bg-accent" : ""
                }`}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(c.updated_at), "d MMM HH:mm", { locale: fr })}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat */}
        <Card className="flex h-[60vh] flex-col shadow-sm">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {loadingHistory && (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            )}
            {!loadingHistory && messages.length === 0 && (
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
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
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
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
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
              Powered by Lovable AI · Vos conversations sont sauvegardées
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Advisor;
