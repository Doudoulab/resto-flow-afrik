import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { prefetchForOffline } from "@/lib/offline/prefetch";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CommandPaletteProvider, useCommandPalette } from "./CommandPalette";
import { MobileBottomNav } from "./MobileBottomNav";
import { NotificationCenter } from "./NotificationCenter";
import { PageTitle } from "./PageTitle";
import { QuickViewProvider } from "./QuickViewSheet";
import { ContextualFab } from "./ContextualFab";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSwipeNav } from "@/hooks/useSwipeNav";
import { OnboardingTour } from "./OnboardingTour";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ReadOnlyBanner } from "@/components/billing/ReadOnlyBanner";
import { useStaffNotifications } from "@/hooks/useStaffNotifications";

const InnerLayout = () => {
  const { restaurant } = useAuth();
  const { open: openPalette } = useCommandPalette();
  const navigate = useNavigate();
  useStaffNotifications(restaurant?.id);
  useKeyboardShortcuts(() => navigate("/app/orders?new=1"));
  useSwipeNav();

  useEffect(() => {
    if (restaurant?.id) {
      prefetchForOffline(restaurant.id);
      const onOnline = () => restaurant?.id && prefetchForOffline(restaurant.id);
      window.addEventListener("online", onOnline);
      return () => window.removeEventListener("online", onOnline);
    }
  }, [restaurant?.id]);

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
            <div className="ml-auto flex items-center gap-2">
              <NotificationCenter />
              <OfflineIndicator />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <ReadOnlyBanner />
          <PageTitle />
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
            <div className="mx-auto max-w-7xl animate-fade-in">
              <Outlet />
            </div>
          </main>
          <MobileBottomNav onSearchClick={openPalette} />
          <ContextualFab />
        </SidebarInset>
      </div>
      <OnboardingTour />
    </SidebarProvider>
  );
};

export const AppLayout = () => (
  <CommandPaletteProvider>
    <QuickViewProvider>
      <InnerLayout />
    </QuickViewProvider>
  </CommandPaletteProvider>
);
