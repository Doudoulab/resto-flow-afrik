import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/app/Dashboard";
import Orders from "./pages/app/Orders";
import Menu from "./pages/app/Menu";
import Stock from "./pages/app/Stock";
import Staff from "./pages/app/Staff";
import SettingsPage from "./pages/app/Settings";
import Reservations from "./pages/app/Reservations";
import Accounting from "./pages/app/Accounting";
import Floor from "./pages/app/Floor";
import TimeClock from "./pages/app/TimeClock";
import Advisor from "./pages/app/Advisor";
import Customers from "./pages/app/Customers";
import IncomingOrders from "./pages/app/IncomingOrders";
import AuditLog from "./pages/app/AuditLog";
import KitchenDisplay from "./pages/app/KitchenDisplay";
import Suppliers from "./pages/app/Suppliers";
import Receipts from "./pages/app/Receipts";
import Inventory from "./pages/app/Inventory";
import Reports from "./pages/app/Reports";
import Payroll from "./pages/app/Payroll";
import TaxReturns from "./pages/app/TaxReturns";
import Ledger from "./pages/app/Ledger";
import Security from "./pages/app/Security";
import Backups from "./pages/app/Backups";
import Health from "./pages/app/Health";
import PublicMenu from "./pages/PublicMenu";
import PublicRestaurant from "./pages/PublicRestaurant";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
