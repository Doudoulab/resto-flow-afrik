import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle, Calendar, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useLiveBadges } from "@/hooks/useLiveBadges";

export const NotificationCenter = () => {
  const badges = useLiveBadges();
  const total = badges.incomingOrders + badges.todayReservations + badges.lowStock;
  const [open, setOpen] = useState(false);

  const items = [
    { icon: ShoppingBag, label: "Commandes QR en attente", count: badges.incomingOrders, to: "/app/incoming", color: "text-blue-500" },
    { icon: Calendar, label: "Réservations aujourd'hui", count: badges.todayReservations, to: "/app/reservations", color: "text-purple-500" },
    { icon: Package, label: "Stock en alerte", count: badges.lowStock, to: "/app/stock", color: "text-orange-500" },
    { icon: AlertTriangle, label: "Plats en préparation", count: badges.pendingKitchen, to: "/app/kitchen", color: "text-red-500" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border px-4 py-3">
          <p className="font-semibold">Notifications</p>
          <p className="text-xs text-muted-foreground">Mises à jour temps réel</p>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {items.map(it => (
            <Link
              key={it.to}
              to={it.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
            >
              <it.icon className={`h-5 w-5 ${it.color}`} />
              <span className="flex-1 text-sm">{it.label}</span>
              {it.count > 0 ? (
                <Badge variant="secondary">{it.count}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">0</span>
              )}
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
