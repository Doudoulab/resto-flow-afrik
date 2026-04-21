import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, LayoutGrid, Bell, Sparkles, Keyboard } from "lucide-react";

const KEY = "onboarding:v1:done";

const STEPS = [
  {
    icon: Sparkles,
    title: "Bienvenue sur RestoFlow 👋",
    body: "Voici un tour express en 4 étapes pour bien démarrer.",
  },
  {
    icon: Search,
    title: "Recherche universelle",
    body: "Appuyez sur ⌘K (ou Ctrl+K) à tout moment pour ouvrir la palette : naviguez, créez, encaissez.",
  },
  {
    icon: Keyboard,
    title: "Raccourcis clavier",
    body: "Tapez G puis O pour aller aux Commandes, G+M pour le Menu, G+F pour la Salle. Tapez N pour créer une commande.",
  },
  {
    icon: Bell,
    title: "Notifications & badges",
    body: "Les badges sur la sidebar vous alertent en temps réel : nouvelles commandes QR, réservations, stock bas.",
  },
  {
    icon: LayoutGrid,
    title: "Modules à activer",
    body: "Allez dans Configuration → Modules pour activer ce dont vous avez besoin (cave, paie, PMS hôtel...).",
  },
];

export const OnboardingTour = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); else setOpen(true); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>{s.title}</DialogTitle>
          <DialogDescription>{s.body}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={finish}>Passer</Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>Précédent</Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>Commencer</Button>
            ) : (
              <Button size="sm" onClick={() => setStep(s => s + 1)}>Suivant</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
