/**
 * Sentry initialization — opt-in via VITE_SENTRY_DSN env var.
 *
 * If no DSN is configured, all calls are no-ops, so the app keeps working
 * unchanged. To enable in production:
 *   1. Create a project on sentry.io (React)
 *   2. Add VITE_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX to your env
 *   3. Re-deploy
 */
import * as Sentry from "@sentry/browser";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return; // silently disabled until DSN is provided

  // Skip in iframes/preview to avoid noise from the Lovable editor
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const previewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");
  if (inIframe || previewHost) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Don't capture noisy network errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      /^NetworkError/,
      /^Failed to fetch$/,
    ],
  });
  initialized = true;
}

export function setSentryUser(user: { id: string; email?: string | null } | null) {
  if (!initialized) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: user.id, email: user.email ?? undefined });
}

export function setSentryRestaurant(restaurantId: string | null) {
  if (!initialized) return;
  Sentry.setTag("restaurant_id", restaurantId ?? "none");
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
