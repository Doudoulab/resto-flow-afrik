import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, PlayCircle, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchArticles,
  type HelpArticle,
} from "@/lib/help/articles";

const HelpVideo = ({ url, title }: { url: string; title: string }) => (
  <div className="my-4 overflow-hidden rounded-lg border border-border bg-muted/30">
    <div className="aspect-video">
      <iframe
        src={url}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  </div>
);

const ArticleBlock = ({ article }: { article: HelpArticle }) => (
  <AccordionItem value={article.id} className="border-border">
    <AccordionTrigger className="text-left hover:no-underline">
      <div className="flex flex-col gap-1 pr-4">
        <span className="font-medium">{article.title}</span>
        <span className="text-xs font-normal text-muted-foreground">{article.summary}</span>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      {article.videoUrl && <HelpVideo url={article.videoUrl} title={article.title} />}
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {article.body}
      </p>
    </AccordionContent>
  </AccordionItem>
);

export default function Help() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  const filtered = useMemo(() => searchArticles(query), [query]);

  const byCategory = useMemo(() => {
    const map = new Map<string, HelpArticle[]>();
    for (const a of filtered) {
      const cur = map.get(a.category) ?? [];
      cur.push(a);
      map.set(a.category, cur);
    }
    return map;
  }, [filtered]);

  const visibleCategories = HELP_CATEGORIES.filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0);

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <BookOpen className="h-7 w-7 text-primary" />
          Centre d'aide
        </h1>
        <p className="mt-2 text-muted-foreground">
          Guides, FAQ et vidéos pour tirer le meilleur de RestoFlow.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans l'aide… (ex. : TVA, Wave, recette, paie)"
          className="pl-9"
        />
        {query && (
          <p className="mt-2 text-xs text-muted-foreground">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""} pour « {query} »
          </p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="all">Tout ({filtered.length})</TabsTrigger>
          {visibleCategories.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              <span className="mr-1">{c.emoji}</span>
              {c.label}
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                {byCategory.get(c.id)?.length ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          {visibleCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun article ne correspond à votre recherche.
              </CardContent>
            </Card>
          ) : (
            visibleCategories.map((c) => (
              <Card key={c.id} className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    <span className="mr-2">{c.emoji}</span>
                    {c.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {byCategory.get(c.id)!.map((a) => (
                      <ArticleBlock key={a.id} article={a} />
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {HELP_CATEGORIES.map((c) => (
          <TabsContent key={c.id} value={c.id}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <span className="mr-2">{c.emoji}</span>
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(byCategory.get(c.id)?.length ?? 0) === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Aucun article dans cette catégorie pour votre recherche.
                  </p>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {(byCategory.get(c.id) ?? []).map((a) => (
                      <ArticleBlock key={a.id} article={a} />
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="mt-8 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:text-left">
          <MessageCircle className="h-10 w-10 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">Vous ne trouvez pas votre réponse ?</p>
            <p className="text-sm text-muted-foreground">
              Notre équipe support répond du lundi au samedi, 9h–18h GMT.
            </p>
          </div>
          <Button asChild>
            <a href="mailto:support@restoflow.app">
              Contacter le support
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
