import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import MyBetsPage from "@/pages/MyBetsPage";
import DepositPage from "@/pages/DepositPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly }: { component: () => JSX.Element; adminOnly?: boolean }) {
  const { user, isLoading, token } = useAuth();
  if (!token) return <Redirect to="/login" />;
  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh] text-white/40 text-sm">Loading...</div>;
  if (adminOnly && !user?.isAdmin) return <Redirect to="/" />;
  return <Component />;
}

function AppRoutes() {
  return (
    <div className="min-h-screen" style={{ background: "#0a1628" }}>
      <Navbar />
      {/* Bottom padding = 56px fixed bottom nav + 8px gap */}
      <div className="pb-16">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/my-bets">
            <ProtectedRoute component={MyBetsPage} />
          </Route>
          <Route path="/deposit">
            <ProtectedRoute component={DepositPage} />
          </Route>
          <Route path="/profile">
            <ProtectedRoute component={ProfilePage} />
          </Route>
          <Route path="/admin">
            <ProtectedRoute component={AdminPage} adminOnly />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
