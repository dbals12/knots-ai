import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import useAnalytics from "@/hooks/useAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Home from "./pages/Home";
import Results from "./pages/Results";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import Processing from "./pages/Processing";

const queryClient = new QueryClient();

// Analytics wrapper component (must be inside BrowserRouter)
const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  useAnalytics();
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const GuestPendingSubmissionInterceptor = ({
  setIntercepting,
}: {
  setIntercepting: (v: boolean) => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // If we've already moved to /processing, stop blocking.
    if (location.pathname === "/processing") setIntercepting(false);
  }, [location.pathname, setIntercepting]);

  useEffect(() => {
    const checkAndRedirect = (event: string) => {
      try {
        const raw = window.localStorage.getItem("guest_pending_submission");
        console.log("[restore-interceptor] auth event:", event, "hasPending:", !!raw);

        if (!raw) return;
        if (location.pathname === "/processing") return;

        setIntercepting(true);
        toast({ title: "아까 작성하신 기록을 불러왔어요!" });
        navigate("/processing", { replace: true });
      } catch (e) {
        console.error("[restore-interceptor] failed to check localStorage", e);
      }
    };

    // Handle OAuth redirect case too (INITIAL_SESSION).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        checkAndRedirect(event);
      }
    });

    // Also run once if the user is already in session.
    if (user) {
      checkAndRedirect("USER_PRESENT");
    }

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate, setIntercepting, user]);

  return null;
};

function App() {
  const [intercepting, setIntercepting] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnalyticsProvider>
              <GuestPendingSubmissionInterceptor setIntercepting={setIntercepting} />
              {intercepting ? (
                <div className="min-h-screen flex items-center justify-center">Loading...</div>
              ) : (
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/input" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/processing" element={<ProtectedRoute><Processing /></ProtectedRoute>} />
                  <Route path="/result" element={<ProtectedRoute><Results /></ProtectedRoute>} />
                  <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </AnalyticsProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

