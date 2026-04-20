import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Badge } from "@/components/ui/badge";
import { CloudOff, Cloud, Loader2, RefreshCw } from "lucide-react";
import { triggerFlush } from "@/lib/offline/sync";
import { Button } from "@/components/ui/button";

export const OfflineIndicator = () => {
  const { online, syncing, pending } = useOfflineSync();

  if (online && pending === 0 && !syncing) {
    return (
      <Badge variant="outline" className="gap-1.5 border-primary/30 text-xs">
        <Cloud className="h-3 w-3 text-primary" /> En ligne
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={online ? "default" : "destructive"} className="gap-1.5 text-xs">
        {!online ? <CloudOff className="h-3 w-3" /> : syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cloud className="h-3 w-3" />}
        {!online ? "Hors-ligne" : syncing ? "Sync…" : "En ligne"}
        {pending > 0 && <span className="ml-1 rounded bg-background/30 px-1 text-[10px] font-bold">{pending}</span>}
      </Badge>
      {online && pending > 0 && !syncing && (
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => triggerFlush()} title="Synchroniser maintenant">
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};