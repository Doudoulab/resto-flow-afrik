import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";

const FAV_KEY = "nav:favorites";
const REC_KEY = "nav:recents";
const MAX_RECENTS = 6;

const read = (k: string): string[] => {
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
};
const write = (k: string, v: string[]) => localStorage.setItem(k, JSON.stringify(v));

export const useNavMemory = () => {
  const [favorites, setFavorites] = useState<string[]>(() => read(FAV_KEY));
  const [recents, setRecents] = useState<string[]>(() => read(REC_KEY));
  const location = useLocation();

  // Track recents on route change
  useEffect(() => {
    const path = location.pathname;
    if (!path.startsWith("/app") || path === "/app/modules") return;
    setRecents(prev => {
      const next = [path, ...prev.filter(p => p !== path)].slice(0, MAX_RECENTS);
      write(REC_KEY, next);
      return next;
    });
  }, [location.pathname]);

  const toggleFavorite = useCallback((path: string) => {
    setFavorites(prev => {
      const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      write(FAV_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((path: string) => favorites.includes(path), [favorites]);

  return { favorites, recents, toggleFavorite, isFavorite };
};
