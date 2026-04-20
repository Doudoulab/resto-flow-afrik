import { supabase } from "@/integrations/supabase/client";
import { listQueue, removeQueueItem, updateQueueItem, type QueueItem } from "./db";

type Listener = (state: { pending: number; syncing: boolean; online: boolean }) => void;
const listeners = new Set<Listener>();
let syncing = false;
let online = typeof navigator !== "undefined" ? navigator.onLine : true;
let pending = 0;

const notify = () => {
  for (const l of listeners) l({ pending, syncing, online });
};

export const subscribeSyncState = (cb: Listener) => {
  listeners.add(cb);
  cb({ pending, syncing, online });
  return () => { listeners.delete(cb); };
};

const refreshPending = async () => {
  const items = await listQueue();
  pending = items.length;
  notify();
  return items;
};

const runItem = async (item: QueueItem): Promise<{ ok: boolean; error?: string }> => {
  try {
    if (item.op.kind === "order_create") {
      const { items, ...orderData } = item.op.payload;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({ ...orderData, status: "pending" })
        .select()
        .single();
      if (error || !order) return { ok: false, error: error?.message ?? "order_failed" };
      if (items.length > 0) {
        const { error: liErr } = await supabase
          .from("order_items")
          .insert(items.map((it) => ({ ...it, order_id: order.id })));
        if (liErr) return { ok: false, error: liErr.message };
      }
      return { ok: true };
    }
    if (item.op.kind === "time_clock_in") {
      const { error } = await supabase.from("time_entries").insert(item.op.payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    if (item.op.kind === "time_clock_out") {
      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: item.op.payload.clock_out })
        .eq("id", item.op.payload.entry_id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    if (item.op.kind === "expense_create") {
      const { error } = await supabase.from("expenses").insert(item.op.payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    return { ok: false, error: "unknown_op" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "exception" };
  }
};

export const flushQueue = async () => {
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  syncing = true;
  notify();
  try {
    const items = await refreshPending();
    for (const item of items) {
      const res = await runItem(item);
      if (res.ok) {
        if (item.id != null) await removeQueueItem(item.id);
      } else {
        await updateQueueItem({ ...item, attempts: item.attempts + 1, last_error: res.error });
        // give up on this run if persistent error to avoid infinite loop within one flush
        break;
      }
    }
  } finally {
    syncing = false;
    await refreshPending();
  }
};

export const initOfflineSync = () => {
  const handleOnline = () => { online = true; notify(); flushQueue(); };
  const handleOffline = () => { online = false; notify(); };
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  // Initial flush + interval retry every 30s when online
  refreshPending().then(() => flushQueue());
  const iv = window.setInterval(() => { if (navigator.onLine) flushQueue(); }, 30_000);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    window.clearInterval(iv);
  };
};

export const triggerFlush = () => flushQueue();
export const refreshPendingNow = () => refreshPending();