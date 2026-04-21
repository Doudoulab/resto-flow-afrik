import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { prefetchForOffline } from "@/lib/offline/prefetch";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export const AppLayout = () => {
  const { restaurant } = useAuth();

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
            <div className="ml-auto flex items-center gap-3">
              <OfflineIndicator />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-7xl animate-fade-in">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
