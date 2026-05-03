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
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { FeatureGate } from "@/components/billing/UpgradePrompt";
import { ROUTE_MODULE_MAP, getRequiredTier, ALL_MODULES } from "@/lib/modules";
import type { ReactNode } from "react";

const gate = (path: string, label: string, node: ReactNode): ReactNode => {
  const moduleKey = ROUTE_MODULE_MAP[path];
  if (!moduleKey) return node;
  const required = getRequiredTier(moduleKey);
  if (required === "free") return node;
  return <FeatureGate required={required} feature={label}>{node}</FeatureGate>;
};

const featureLabel = (path: string): string => {
  const key = ROUTE_MODULE_MAP[path];
  if (!key) return "Cette fonctionnalité";
  return ALL_MODULES.find(m => m.key === key)?.label ?? "Cette fonctionnalité";
};

// Eager: landing & auth (smallest, first paint critical)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Vente from "./pages/Vente";

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
const SetupAssistant = lazy(() => import("./pages/app/SetupAssistant"));
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
const Schedule = lazy(() => import("./pages/app/Schedule"));
const Billing = lazy(() => import("./pages/app/Billing"));
const Help = lazy(() => import("./pages/app/Help"));
const Restaurants = lazy(() => import("./pages/app/Restaurants"));
const ConsolidatedReports = lazy(() => import("./pages/app/ConsolidatedReports"));
const ApiKeys = lazy(() => import("./pages/app/ApiKeys"));
const WhiteLabel = lazy(() => import("./pages/app/WhiteLabel"));
const PublicMenu = lazy(() => import("./pages/PublicMenu"));
const PublicRestaurant = lazy(() => import("./pages/PublicRestaurant"));
const PublicOrderTracking = lazy(() => import("./pages/PublicOrderTracking"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));

// Super-admin panel
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminRestaurants = lazy(() => import("./pages/admin/Restaurants"));
const AdminSubscriptions = lazy(() => import("./pages/admin/Subscriptions"));
const AdminStats = lazy(() => import("./pages/admin/Stats"));
const AdminWebhooks = lazy(() => import("./pages/admin/Webhooks"));
const AdminErrors = lazy(() => import("./pages/admin/Errors"));
const AdminAdmins = lazy(() => import("./pages/admin/Admins"));
const AdminChariow = lazy(() => import("./pages/admin/Chariow"));

const PageFallback = () => (
  <div className="flex h-[60vh] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <PaymentTestModeBanner />
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/vente" element={<Vente />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/invitation/:token" element={<AcceptInvitation />} />
            <Route path="/m/:restaurantId" element={<PublicMenu />} />
            <Route path="/r/:slug" element={<PublicRestaurant />} />
            <Route path="/r/:slug/order/:orderId" element={<PublicOrderTracking />} />
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
              <Route path="suppliers" element={gate("/app/suppliers", featureLabel("/app/suppliers"), <Suppliers />)} />
              <Route path="receipts" element={gate("/app/receipts", featureLabel("/app/receipts"), <Receipts />)} />
              <Route path="inventory" element={gate("/app/inventory", featureLabel("/app/inventory"), <Inventory />)} />
              <Route path="reports" element={gate("/app/reports", featureLabel("/app/reports"), <Reports />)} />
              <Route path="accounting" element={gate("/app/accounting", featureLabel("/app/accounting"), <Accounting />)} />
              <Route path="ledger" element={gate("/app/ledger", featureLabel("/app/ledger"), <Ledger />)} />
              <Route path="payroll" element={gate("/app/payroll", featureLabel("/app/payroll"), <Payroll />)} />
              <Route path="tax" element={gate("/app/tax", featureLabel("/app/tax"), <TaxReturns />)} />
              <Route path="staff" element={<Staff />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="timeclock" element={gate("/app/timeclock", featureLabel("/app/timeclock"), <TimeClock />)} />
              <Route path="customers" element={gate("/app/customers", featureLabel("/app/customers"), <Customers />)} />
              <Route path="incoming" element={gate("/app/incoming", featureLabel("/app/incoming"), <IncomingOrders />)} />
              <Route path="advisor" element={gate("/app/advisor", featureLabel("/app/advisor"), <Advisor />)} />
              <Route path="setup-ai" element={<SetupAssistant />} />
              <Route path="audit" element={gate("/app/audit", featureLabel("/app/audit"), <AuditLog />)} />
              <Route path="kitchen" element={gate("/app/kitchen", featureLabel("/app/kitchen"), <KitchenDisplay />)} />
              <Route path="security" element={gate("/app/security", featureLabel("/app/security"), <Security />)} />
              <Route path="backups" element={gate("/app/backups", featureLabel("/app/backups"), <Backups />)} />
              <Route path="health" element={<Health />} />
              <Route path="printers" element={gate("/app/printers", featureLabel("/app/printers"), <Printers />)} />
              <Route path="fiscal" element={gate("/app/fiscal", featureLabel("/app/fiscal"), <Fiscal />)} />
              <Route path="exports" element={gate("/app/exports", featureLabel("/app/exports"), <Exports />)} />
              <Route path="errors" element={<Errors />} />
              <Route path="wines" element={gate("/app/wines", featureLabel("/app/wines"), <Wines />)} />
              <Route path="tasting" element={gate("/app/tasting", featureLabel("/app/tasting"), <TastingMenus />)} />
              <Route path="menu-engineering" element={gate("/app/menu-engineering", featureLabel("/app/menu-engineering"), <MenuEngineering />)} />
              <Route path="analytics" element={gate("/app/analytics", featureLabel("/app/analytics"), <Analytics />)} />
              <Route path="pms" element={gate("/app/pms", featureLabel("/app/pms"), <PmsReconciliation />)} />
              <Route path="gueridon" element={gate("/app/gueridon", featureLabel("/app/gueridon"), <Gueridon />)} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="modules" element={<Modules />} />
              <Route path="billing" element={<Billing />} />
              <Route path="help" element={<Help />} />
              <Route path="restaurants" element={<Restaurants />} />
              <Route path="consolidated" element={gate("/app/consolidated", featureLabel("/app/consolidated"), <ConsolidatedReports />)} />
              <Route path="api-keys" element={gate("/app/api-keys", featureLabel("/app/api-keys"), <ApiKeys />)} />
              <Route path="white-label" element={gate("/app/white-label", featureLabel("/app/white-label"), <WhiteLabel />)} />
            </Route>
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="restaurants" element={<AdminRestaurants />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="stats" element={<AdminStats />} />
              <Route path="webhooks" element={<AdminWebhooks />} />
              <Route path="errors" element={<AdminErrors />} />
              <Route path="admins" element={<AdminAdmins />} />
              <Route path="chariow" element={<AdminChariow />} />
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
