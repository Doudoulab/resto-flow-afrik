import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Linear sequence of "main" pages for swipe navigation on mobile
const SEQUENCE = [
  "/app",
  "/app/orders",
  "/app/floor",
  "/app/reservations",
  "/app/menu",
  "/app/kitchen",
];

export const useSwipeNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;

    let startX = 0, startY = 0, startT = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY; startT = Date.now();
    };

    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;
      if (dt > 600) return;
      if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
      // Ignore swipes near edges (reserved for system back gesture)
      if (startX < 24 || startX > window.innerWidth - 24) return;

      const idx = SEQUENCE.indexOf(location.pathname);
      if (idx === -1) return;
      if (dx < 0 && idx < SEQUENCE.length - 1) navigate(SEQUENCE[idx + 1]);
      else if (dx > 0 && idx > 0) navigate(SEQUENCE[idx - 1]);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [location.pathname, navigate]);
};
