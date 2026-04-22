import { useState } from "react";
import { Building2, Plus, Check, AlertTriangle, Loader2, Crown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useOwnedRestaurants, useSwitchRestaurant, useCreateRestaurant } from "@/hooks/useRestaurants";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import { PageTitle } from "@/components/layout/PageTitle";

export default function Restaurants() {
  const { data: restaurants = [], isLoading } = useOwnedRestaurants();
  const { tier } = useSubscription();
  const switchMut = useSwitchRestaurant();
  const createMut = useCreateRestaurant();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const isBusiness = tier === "business";
  const max = isBusiness ? 9999 : 1;
  const canCreate = restaurants.length < max;

  const handleCreate = () => {
    if (!name.trim()) return;
    createMut.mutate(
      { name: name.trim(), switchTo: true },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Mes établissements" subtitle="Gérez plusieurs restaurants depuis un seul compte" />

      {!isBusiness && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <Crown className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-medium">Le multi-établissements est réservé au plan Business</p>
              <p className="text-sm text-muted-foreground">
                Votre plan actuel autorise 1 seul établissement. Passez au plan Business pour gérer
                un nombre illimité de restaurants depuis un seul compte.
              </p>
              <Button asChild size="sm" className="mt-2">
                <Link to="/app/billing">Voir les plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {restaurants.length} établissement{restaurants.length > 1 ? "s" : ""}
            {isBusiness ? " (illimité)" : ` / ${max}`}
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={!canCreate}
          title={!canCreate ? "Quota atteint - passez au plan Business" : undefined}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvel établissement
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map(r => (
            <Card key={r.id} className={r.is_active ? "border-primary ring-1 ring-primary/20" : ""}>
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate flex items-center gap-2">
                    {r.name}
                    {r.is_active && (
                      <Badge variant="default" className="text-[10px] h-5 gap-1">
                        <Check className="h-3 w-3" /> Actif
                      </Badge>
                    )}
                  </CardTitle>
                  {r.slug && (
                    <CardDescription className="text-xs truncate">/r/{r.slug}</CardDescription>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {r.suspended_at && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> Suspendu
                  </div>
                )}
                <Button
                  variant={r.is_active ? "secondary" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={r.is_active || switchMut.isPending || !!r.suspended_at}
                  onClick={() => switchMut.mutate(r.id)}
                >
                  {switchMut.isPending && switchMut.variables === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : r.is_active ? (
                    "Restaurant actif"
                  ) : (
                    "Basculer ici"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel établissement</DialogTitle>
            <DialogDescription>
              Créez un restaurant supplémentaire. Vous serez automatiquement basculé dessus
              et pourrez configurer son menu, son personnel et ses paramètres séparément.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resto-name">Nom du restaurant</Label>
            <Input
              id="resto-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Le Bistrot du Plateau"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={createMut.isPending}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createMut.isPending}>
              {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer et basculer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}