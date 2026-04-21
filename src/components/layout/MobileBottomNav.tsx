import { NavLink } from "react-router-dom";
import { ClipboardList, LayoutGrid, Flame, UtensilsCrossed, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app/orders", icon: ClipboardList, label: "Commandes" },
  { to: "/app/floor", icon: LayoutGrid, label: "Salle" },
  { to: "/app/kitchen", icon: Flame, label: "Cuisine" },
  { to: "/app/menu", icon: UtensilsCrossed, label: "Menu" },
];

export const MobileBottomNav = ({ onSearchClick }: { onSearchClick: () => void }) => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden safe-area-pb">
    {items.map(it => (
      <NavLink
        key={it.to}
        to={it.to}
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )
        }
      >
        <it.icon className="h-5 w-5" />
        <span className="truncate text-[10px]">{it.label}</span>
      </NavLink>
    ))}
    <button
      onClick={onSearchClick}
      className="flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <Search className="h-5 w-5" />
      <span className="text-[10px]">Recherche</span>
    </button>
  </nav>
);
