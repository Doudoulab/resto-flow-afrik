import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Vim-like leader sequences: press G then a key to jump
const ROUTES: Record<string, string> = {
  d: "/app",
  o: "/app/orders",
  f: "/app/floor",
  r: "/app/reservations",
  m: "/app/menu",
  s: "/app/stock",
  k: "/app/kitchen",
  i: "/app/incoming",
  p: "/app/staff",
};

export const useKeyboardShortcuts = (onNew?: () => void) => {
  const navigate = useNavigate();

  useEffect(() => {
    let leader = false;
    let timer: number | undefined;

    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      if (leader) {
        const key = e.key.toLowerCase();
        const dest = ROUTES[key];
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
        leader = false;
        if (timer) window.clearTimeout(timer);
        return;
      }

      if (e.key.toLowerCase() === "g") {
        leader = true;
        timer = window.setTimeout(() => { leader = false; }, 1200);
        return;
      }

      if (e.key.toLowerCase() === "n" && onNew) {
        e.preventDefault();
        onNew();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (timer) window.clearTimeout(timer);
    };
  }, [navigate, onNew]);
};
