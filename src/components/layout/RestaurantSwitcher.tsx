import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Plus, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOwnedRestaurants, useSwitchRestaurant } from "@/hooks/useRestaurants";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  collapsed?: boolean;
}

export function RestaurantSwitcher({ collapsed = false }: Props) {
  const { profile, restaurant } = useAuth();
  const navigate = useNavigate();
  const { data: restaurants = [], isLoading } = useOwnedRestaurants();
  const switchMut = useSwitchRestaurant();

  // Only show for owners with more than one restaurant OR when they could create more
  if (!profile?.is_owner) return null;
  if (isLoading) {
    return collapsed ? null : (
      <div className="px-2 py-1.5 text-xs text-sidebar-foreground/50 flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
      </div>
    );
  }
  // If only one restaurant and no switching capability needed at all, hide entirely
  if (restaurants.length <= 1) {
    // Still expose the entry to manage / add when collapsed=false
    if (collapsed) return null;
    return (
      <div className="px-2 pb-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => navigate("/app/restaurants")}
        >
          <Building2 className="h-3.5 w-3.5" />
          Gérer mes établissements
        </Button>
      </div>
    );
  }

  const active = restaurants.find(r => r.is_active) ?? restaurants[0];

  return (
    <div className={cn("px-2 pb-2", collapsed && "px-1")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-between gap-2 bg-sidebar-accent/40 border-sidebar-border",
              collapsed && "px-2"
            )}
            disabled={switchMut.isPending}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="truncate text-xs font-medium">{active?.name ?? restaurant?.name}</span>
              )}
            </div>
            {!collapsed && <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs">Mes établissements ({restaurants.length})</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {restaurants.map(r => (
            <DropdownMenuItem
              key={r.id}
              onClick={() => !r.is_active && switchMut.mutate(r.id)}
              disabled={switchMut.isPending}
              className="gap-2"
            >
              <Check className={cn("h-4 w-4", r.is_active ? "opacity-100" : "opacity-0")} />
              <span className="flex-1 truncate">{r.name}</span>
              {r.suspended_at && <span className="text-[10px] text-destructive">suspendu</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/app/restaurants")} className="gap-2">
            <Plus className="h-4 w-4" />
            Gérer / Ajouter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}