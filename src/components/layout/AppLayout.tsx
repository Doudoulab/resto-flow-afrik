import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { prefetchForOffline } from "@/lib/offline/prefetch";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette } from "./CommandPalette";
import { MobileBottomNav } from "./MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const AppLayout = () => {
  const { restaurant } = useAuth();
  const [paletteKey, setPaletteKey] = useState(0);

  useEffect(() => {
    if (restaurant?.id) {
      prefetchForOffline(restaurant.id);
      const onOnline = () => restaurant?.id && prefetchForOffline(restaurant.id);
      window.addEventListener("online", onOnline);
      return () => window.removeEventListener("online", onOnline);
    }
  }, [restaurant?.id]);

  const openPalette = () => {
    // Simulate Cmd+K
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    setPaletteKey(k => k + 1);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
            <SidebarTrigger />
            <p className="flex-1 truncate font-semibold md:hidden">{restaurant?.name || "RestoFlow"}</p>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex items-center gap-2 text-muted-foreground"
              onClick={openPalette}
            >
              <Search className="h-4 w-4" />
              <span>Rechercher...</span>
              <kbd className="ml-4 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                ⌘K
              </kbd>
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <OfflineIndicator />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
            <div className="mx-auto max-w-7xl animate-fade-in">
              <Outlet />
            </div>
          </main>
          <MobileBottomNav onSearchClick={openPalette} />
        </SidebarInset>
        <CommandPalette key={paletteKey} />
      </div>
    </SidebarProvider>
  );
};
