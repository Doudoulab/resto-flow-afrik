import { useMemo, useState } from "react";
import { format, addDays, startOfDay, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservationLite {
  id: string;
  customer_name: string;
  party_size: number;
  reserved_at: string;
  table_number: string | null;
  status: string;
}

interface Props {
  reservations: ReservationLite[];
  onSelect: (id: string) => void;
}

export const ReservationCalendar = ({ reservations, onSelect }: Props) => {
  const [anchor, setAnchor] = useState(startOfDay(new Date()));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-medium">
          {format(days[0], "d MMM", { locale: fr })} → {format(days[6], "d MMM yyyy", { locale: fr })}
        </span>
        <Button size="sm" variant="outline" onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dayRes = reservations.filter((r) => isSameDay(parseISO(r.reserved_at), d));
          return (
            <Card key={d.toISOString()} className={cn("p-2 min-h-[140px] space-y-1", isSameDay(d, new Date()) && "border-primary")}>
              <div className="text-xs font-medium text-center border-b pb-1 mb-1">
                <div className="text-muted-foreground capitalize">{format(d, "EEE", { locale: fr })}</div>
                <div className="text-base">{format(d, "d")}</div>
              </div>
              <div className="space-y-1">
                {dayRes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center">—</p>
                ) : dayRes.slice(0, 4).map((r) => (
                  <button key={r.id} onClick={() => onSelect(r.id)} className="w-full text-left rounded bg-muted/50 px-1.5 py-1 text-[11px] hover:bg-muted">
                    <div className="font-semibold truncate">{r.customer_name}</div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />{format(parseISO(r.reserved_at), "HH:mm")}
                      <Users className="h-2.5 w-2.5 ml-1" />{r.party_size}
                    </div>
                  </button>
                ))}
                {dayRes.length > 4 && <Badge variant="secondary" className="text-[10px] w-full justify-center">+{dayRes.length - 4}</Badge>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};