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

// PWA: register service worker only outside iframe & lovable preview hosts
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
} else if ("serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  }).catch(() => {});
}

// Always start the offline sync engine (works without SW too)
initOfflineSync();
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <App />
  </ThemeProvider>
);
