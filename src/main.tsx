import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { initOfflineSync } from "@/lib/offline/sync";
import "@/lib/i18n";
import { installGlobalErrorHandlers } from "@/lib/monitoring/logger";
import { initSentry } from "@/lib/monitoring/sentry";

// Initialize Sentry as early as possible (no-op when VITE_SENTRY_DSN is absent)
initSentry();

// We migrated to Capacitor for the native app. Any previously-registered
// PWA service worker is replaced by the kill-switch SW served from /sw.js
// (and /service-worker.js for legacy paths). The browser will fetch the
// new SW on next visit, which then unregisters itself and clears caches.

// Always start the offline sync engine (works without SW too)
initOfflineSync();
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <App />
  </ThemeProvider>
);
