import { useEffect, useState } from "react";
import { subscribeSyncState, refreshPendingNow } from "@/lib/offline/sync";

export const useOfflineSync = () => {
  const [state, setState] = useState({ pending: 0, syncing: false, online: typeof navigator !== "undefined" ? navigator.onLine : true });
  useEffect(() => {
    const unsub = subscribeSyncState(setState);
    refreshPendingNow();
    return unsub;
  }, []);
  return state;
};