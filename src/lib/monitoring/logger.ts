import { supabase } from "@/integrations/supabase/client";

export interface LogContext {
  [key: string]: unknown;
}

let cachedRestaurantId: string | null = null;
export const setMonitoringRestaurantId = (id: string | null) => {
  cachedRestaurantId = id;
};

const trim = (s: string | undefined | null, n: number) =>
  s ? (s.length > n ? s.slice(0, n) : s) : null;

export async function logError(
  err: unknown,
  context: LogContext = {},
  level: "error" | "warn" | "info" = "error"
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // RLS requires authenticated user
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    const stack = err instanceof Error ? err.stack : null;
    await supabase.from("error_logs").insert({
      user_id: user.id,
      restaurant_id: cachedRestaurantId,
      level,
      message: trim(message, 1000) ?? "Unknown",
      stack: trim(stack ?? null, 8000),
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      context: context as never,
    });
  } catch {
    // never throw from the logger
  }
}

/** Install global handlers to capture unhandled errors / promise rejections. */
export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => {
    logError(e.error ?? e.message, { source: "window.onerror", filename: e.filename, line: e.lineno });
  });
  window.addEventListener("unhandledrejection", (e) => {
    logError(e.reason, { source: "unhandledrejection" });
  });
}