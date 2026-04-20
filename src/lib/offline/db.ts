import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type QueueOperation =
  | {
      kind: "order_create";
      payload: {
        restaurant_id: string;
        table_number: string | null;
        notes: string | null;
        total: number;
        created_by: string | null;
        items: Array<{ menu_item_id: string | null; name_snapshot: string; unit_price: number; quantity: number }>;
      };
    }
  | {
      kind: "time_clock_in";
      payload: { restaurant_id: string; user_id: string; clock_in: string };
    }
  | {
      kind: "time_clock_out";
      payload: { entry_id: string; clock_out: string };
    }
  | {
      kind: "expense_create";
      payload: { restaurant_id: string; category: string; description: string; amount: number; expense_date: string };
    };

export interface QueueItem {
  id?: number;
  op: QueueOperation;
  created_at: number;
  attempts: number;
  last_error?: string;
}

interface RestoFlowDB extends DBSchema {
  queue: {
    key: number;
    value: QueueItem;
    indexes: { by_created: number };
  };
  cache: {
    key: string;
    value: { key: string; value: unknown; updated_at: number };
  };
}

let _db: Promise<IDBPDatabase<RestoFlowDB>> | null = null;

export const getDB = () => {
  if (!_db) {
    _db = openDB<RestoFlowDB>("restoflow-offline", 1, {
      upgrade(db) {
        const queue = db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
        queue.createIndex("by_created", "created_at");
        db.createObjectStore("cache", { keyPath: "key" });
      },
    });
  }
  return _db;
};

export const enqueue = async (op: QueueOperation): Promise<number> => {
  const db = await getDB();
  return db.add("queue", { op, created_at: Date.now(), attempts: 0 });
};

export const listQueue = async (): Promise<QueueItem[]> => {
  const db = await getDB();
  return db.getAllFromIndex("queue", "by_created");
};

export const removeQueueItem = async (id: number) => {
  const db = await getDB();
  await db.delete("queue", id);
};

export const updateQueueItem = async (item: QueueItem) => {
  const db = await getDB();
  await db.put("queue", item);
};

export const cacheSet = async (key: string, value: unknown) => {
  const db = await getDB();
  await db.put("cache", { key, value, updated_at: Date.now() });
};

export const cacheGet = async <T = unknown>(key: string): Promise<T | null> => {
  const db = await getDB();
  const row = await db.get("cache", key);
  return (row?.value as T) ?? null;
};