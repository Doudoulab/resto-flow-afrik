import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eager: landing & auth (smallest, first paint critical)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy: app pages (each becomes its own chunk)
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Orders = lazy(() => import("./pages/app/Orders"));
const Menu = lazy(() => import("./pages/app/Menu"));
const Stock = lazy(() => import("./pages/app/Stock"));
const Staff = lazy(() => import("./pages/app/Staff"));
const SettingsPage = lazy(() => import("./pages/app/Settings"));
const Reservations = lazy(() => import("./pages/app/Reservations"));
const Accounting = lazy(() => import("./pages/app/Accounting"));
const Floor = lazy(() => import("./pages/app/Floor"));
const TimeClock = lazy(() => import("./pages/app/TimeClock"));
const Advisor = lazy(() => import("./pages/app/Advisor"));
const Customers = lazy(() => import("./pages/app/Customers"));
const IncomingOrders = lazy(() => import("./pages/app/IncomingOrders"));
const AuditLog = lazy(() => import("./pages/app/AuditLog"));
const KitchenDisplay = lazy(() => import("./pages/app/KitchenDisplay"));
const Suppliers = lazy(() => import("./pages/app/Suppliers"));
const Receipts = lazy(() => import("./pages/app/Receipts"));
const Inventory = lazy(() => import("./pages/app/Inventory"));
const Reports = lazy(() => import("./pages/app/Reports"));
const Payroll = lazy(() => import("./pages/app/Payroll"));
const TaxReturns = lazy(() => import("./pages/app/TaxReturns"));
const Ledger = lazy(() => import("./pages/app/Ledger"));
const Security = lazy(() => import("./pages/app/Security"));
const Backups = lazy(() => import("./pages/app/Backups"));
const Health = lazy(() => import("./pages/app/Health"));
const Printers = lazy(() => import("./pages/app/Printers"));
const Fiscal = lazy(() => import("./pages/app/Fiscal"));
const Exports = lazy(() => import("./pages/app/Exports"));
const Errors = lazy(() => import("./pages/app/Errors"));
const Wines = lazy(() => import("./pages/app/Wines"));
const TastingMenus = lazy(() => import("./pages/app/TastingMenus"));
const MenuEngineering = lazy(() => import("./pages/app/MenuEngineering"));
const Analytics = lazy(() => import("./pages/app/Analytics"));
const PmsReconciliation = lazy(() => import("./pages/app/PmsReconciliation"));
const Gueridon = lazy(() => import("./pages/app/Gueridon"));
const Modules = lazy(() => import("./pages/app/Modules"));
const PublicMenu = lazy(() => import("./pages/PublicMenu"));
const PublicRestaurant = lazy(() => import("./pages/PublicRestaurant"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));

const PageFallback = () => (
  <div className="flex h-[60vh] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/invitation/:token" element={<AcceptInvitation />} />
            <Route path="/m/:restaurantId" element={<PublicMenu />} />
            <Route path="/r/:slug" element={<PublicRestaurant />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="floor" element={<Floor />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="menu" element={<Menu />} />
              <Route path="stock" element={<Stock />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="accounting" element={<Accounting />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="payroll" element={<Payroll />} />
              <Route path="tax" element={<TaxReturns />} />
              <Route path="staff" element={<Staff />} />
              <Route path="timeclock" element={<TimeClock />} />
              <Route path="customers" element={<Customers />} />
              <Route path="incoming" element={<IncomingOrders />} />
              <Route path="advisor" element={<Advisor />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="kitchen" element={<KitchenDisplay />} />
              <Route path="security" element={<Security />} />
              <Route path="backups" element={<Backups />} />
              <Route path="health" element={<Health />} />
              <Route path="printers" element={<Printers />} />
              <Route path="fiscal" element={<Fiscal />} />
              <Route path="exports" element={<Exports />} />
              <Route path="errors" element={<Errors />} />
              <Route path="wines" element={<Wines />} />
              <Route path="tasting" element={<TastingMenus />} />
              <Route path="menu-engineering" element={<MenuEngineering />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="pms" element={<PmsReconciliation />} />
              <Route path="gueridon" element={<Gueridon />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="modules" element={<Modules />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
