import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Budget from "@/pages/Budget";
import Savings from "@/pages/Savings";
import Advisor from "@/pages/Advisor";
import Debts from "@/pages/Debts";
import Tax from "@/pages/Tax";
import Investments from "@/pages/Investments";
import Bills from "@/pages/Bills";
import Settings from "@/pages/Settings";
import SmsParser from "@/pages/SmsParser";
import Reports from "@/pages/Reports";
import Auth from "@/pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Documentation from "./pages/Documentation";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 rounded-xl gradient-primary animate-pulse-soft" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <I18nProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/docs" element={<ProtectedRoute><div className="min-h-screen bg-background p-4 max-w-2xl mx-auto"><Documentation /></div></ProtectedRoute>} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/savings" element={<Savings />} />
                  <Route path="/debts" element={<Debts />} />
                  <Route path="/tax" element={<Tax />} />
                  <Route path="/investments" element={<Investments />} />
                  <Route path="/bills" element={<Bills />} />
                  <Route path="/advisor" element={<Advisor />} />
                  <Route path="/sms-parser" element={<SmsParser />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </I18nProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
