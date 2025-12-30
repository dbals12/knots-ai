import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * /auth/callback
 * 
 * This route handles OAuth redirects and ensures users are sent to the correct
 * destination after login:
 * 
 * 1. If ?next= query param exists → go there
 * 2. Else if localStorage.pending_draft_id exists → go to /result/:draftId
 * 3. Else → go to /input (default logged-in home)
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Supabase to process the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[auth/callback] Session error:", sessionError);
          setStatus("error");
          setErrorMessage(sessionError.message);
          return;
        }

        // Also listen for auth state change in case session isn't ready yet
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "SIGNED_IN" && session) {
              console.log("[auth/callback] SIGNED_IN event received");
              await processRedirect(session.user.id);
              subscription.unsubscribe();
            }
          }
        );

        // If session already exists, process immediately
        if (session) {
          console.log("[auth/callback] Session already exists");
          await processRedirect(session.user.id);
          subscription.unsubscribe();
        }
      } catch (err) {
        console.error("[auth/callback] Error:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      }
    };

    const processRedirect = async (userId: string) => {
      // Ensure user exists in users table
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (!userData) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("users").upsert({
              id: user.id,
              email: user.email,
            }, { onConflict: "id" });
          }
        }
      } catch (err) {
        console.warn("[auth/callback] Failed to ensure user row:", err);
      }

      // Determine redirect target
      let target = "/input"; // Default destination

      // Priority 1: ?next= query param
      const nextParam = searchParams.get("next");
      if (nextParam) {
        target = nextParam;
        console.log("[auth/callback] Using ?next= param:", target);
      } else {
        // Priority 2: pending_draft_id in localStorage
        try {
          const pendingDraftId = localStorage.getItem("pending_draft_id");
          if (pendingDraftId) {
            target = `/result/${pendingDraftId}`;
            console.log("[auth/callback] Using pending_draft_id:", target);
          }
        } catch {}
      }

      // Clear any old guest submission data
      try {
        localStorage.removeItem("guest_pending_submission");
      } catch {}

      console.log("[auth/callback] Navigating to:", target);
      navigate(target, { replace: true });
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">로그인에 실패했습니다</h2>
          <p className="text-muted-foreground">{errorMessage || "알 수 없는 오류가 발생했습니다."}</p>
          <button
            onClick={() => navigate("/login")}
            className="text-primary hover:underline"
          >
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
