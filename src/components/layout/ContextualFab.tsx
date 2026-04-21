import { useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACTIONS: Record<string, { to: string; label: string }> = {
  "/app/orders": { to: "/app/orders?new=1", label: "Nouvelle commande" },
  "/app/reservations": { to: "/app/reservations?new=1", label: "Nouvelle réservation" },
  "/app/customers": { to: "/app/customers?new=1", label: "Nouveau client" },
  "/app/menu": { to: "/app/menu?new=1", label: "Nouveau plat" },
  "/app/stock": { to: "/app/stock?new=1", label: "Nouvel article" },
  "/app/staff": { to: "/app/staff?new=1", label: "Inviter employé" },
  "/app/suppliers": { to: "/app/suppliers?new=1", label: "Nouveau fournisseur" },
  "/app/receipts": { to: "/app/receipts?new=1", label: "Nouvelle réception" },
};

export const ContextualFab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const action = ACTIONS[location.pathname];
  if (!action) return null;

  return (
    <Button
      size="icon"
      onClick={() => navigate(action.to)}
      aria-label={action.label}
      className={cn(
        "md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg",
        "bg-primary text-primary-foreground hover:bg-primary/90"
      )}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
};
