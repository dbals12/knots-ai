import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackLoginSuccess } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

// Promote lock helpers
const LOCK_PREFIX = "promote_lock_";
const LOCK_TTL_MS = 30_000;

const acquireLock = (draftId: string): boolean => {
  const key = LOCK_PREFIX + draftId;
  const existing = localStorage.getItem(key);
  if (existing) {
    const ts = parseInt(existing, 10);
    if (Date.now() - ts < LOCK_TTL_MS) return false; // still locked
  }
  localStorage.setItem(key, Date.now().toString());
  return true;
};

const releaseLock = (draftId: string) => {
  localStorage.removeItem(LOCK_PREFIX + draftId);
};

// Poll drafts.session_id with retries
const pollDraftSessionId = async (draftId: string, retries = 3, delayMs = 800): Promise<string | null> => {
  for (let i = 0; i < retries; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const { data } = await supabase
      .from("drafts")
      .select("session_id")
      .eq("id", draftId)
      .single();
    if (data?.session_id) return data.session_id;
  }
  return null;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState("로그인 완료! 결과 불러오는 중...");
  const [failState, setFailState] = useState<{ draftId: string; next: string | null } | null>(null);

  const logPromoteEvent = async (eventType: string, userId: string | undefined, draftId: string, extra?: Record<string, any>) => {
    try {
      if (!userId) return;
      await supabase.from("events").insert({
        event_type: eventType,
        user_id: userId,
        metadata: { draft_id: draftId, ...extra },
      });
    } catch (e) {
      console.warn("[AuthCallback] event log failed:", e);
    }
  };

  const attemptPromote = async (draftId: string, accessToken: string, userId: string): Promise<{ success: boolean; sessionId?: string }> => {
    console.log("[AuthCallback] promote_start draft_id=", draftId);
    await logPromoteEvent("promote_start", userId, draftId);

    const { data, error } = await supabase.functions.invoke("promote-draft", {
      body: { draft_id: draftId },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Already promoted
    if (!error && data?.already_promoted && data?.session_id) {
      console.log("[AuthCallback] promote_already session_id=", data.session_id);
      await logPromoteEvent("promote_already", userId, draftId, { session_id: data.session_id });
      return { success: true, sessionId: data.session_id };
    }

    // Success
    if (!error && data?.session_id) {
      console.log("[AuthCallback] promote_success session_id=", data.session_id);
      await logPromoteEvent("promote_success", userId, draftId, { session_id: data.session_id });
      return { success: true, sessionId: data.session_id };
    }

    // Failed - poll drafts.session_id as fallback
    console.error("[AuthCallback] promote-draft invoke failed:", error, data);
    const polledSessionId = await pollDraftSessionId(draftId);
    if (polledSessionId) {
      console.log("[AuthCallback] promote recovered via poll session_id=", polledSessionId);
      await logPromoteEvent("promote_success", userId, draftId, { session_id: polledSessionId, recovered: true });
      return { success: true, sessionId: polledSessionId };
    }

    await logPromoteEvent("promote_fail", userId, draftId, {
      error: error?.message || data?.error || "unknown",
    });
    return { success: false };
  };

  useEffect(() => {
    const handleRedirect = async () => {
      const searchParams = new URLSearchParams(location.search);
      const next = searchParams.get("next");
      const pendingDraftId = localStorage.getItem("pending_draft_id");

      // Get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        toast({ title: "로그인이 필요합니다", description: "다시 로그인해 주세요.", variant: "destructive" });
        navigate("/login");
        return;
      }

      // Track login_success
      trackLoginSuccess({ draft_id: pendingDraftId || undefined });

      // Ensure users table entry
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();
        if (!userData) {
          await supabase.from("users").insert({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
          });
        }
      }

      const userId = user?.id;

      try {
        // Case A: next URL contains draft_id
        if (next && next.includes("/result/") && next.includes("type=draft")) {
          const m = next.match(/\/result\/([^?]+)/);
          const draftIdFromNext = m?.[1];

          if (draftIdFromNext) {
            if (!acquireLock(draftIdFromNext)) {
              console.log("[AuthCallback] lock active, skipping promote for", draftIdFromNext);
              // Poll to see if already promoted
              const polledId = await pollDraftSessionId(draftIdFromNext);
              if (polledId) {
                navigate(`/result/${polledId}?type=session`, { replace: true });
              } else {
                navigate(next, { replace: true });
              }
              return;
            }

            setMessage("결과를 저장하는 중...");
            const result = await attemptPromote(draftIdFromNext, accessToken, userId!);
            releaseLock(draftIdFromNext);

            if (result.success && result.sessionId) {
              localStorage.removeItem("pending_draft_id");
              navigate(`/result/${result.sessionId}?type=session`, { replace: true });
            } else {
              setFailState({ draftId: draftIdFromNext, next });
            }
            return;
          }
        }

        // Case B: no next but pendingDraftId
        if (!next && pendingDraftId) {
          if (!acquireLock(pendingDraftId)) {
            console.log("[AuthCallback] lock active, skipping promote for", pendingDraftId);
            const polledId = await pollDraftSessionId(pendingDraftId);
            if (polledId) {
              navigate(`/result/${polledId}?type=session`, { replace: true });
            } else {
              navigate(`/result/${pendingDraftId}?type=draft`, { replace: true });
            }
            return;
          }

          setMessage("결과를 저장하는 중...");
          const result = await attemptPromote(pendingDraftId, accessToken, userId!);
          releaseLock(pendingDraftId);

          if (result.success && result.sessionId) {
            localStorage.removeItem("pending_draft_id");
            navigate(`/result/${result.sessionId}?type=session`, { replace: true });
          } else {
            setFailState({ draftId: pendingDraftId, next: null });
          }
          return;
        }

        // Normal login flow
        if (next) {
          navigate(next, { replace: true });
        } else {
          navigate("/input", { replace: true });
        }
      } catch (e) {
        console.error("[AuthCallback] unexpected error:", e);
        const fallbackDraftId = pendingDraftId || (next?.match(/\/result\/([^?]+)/)?.[1]);
        if (fallbackDraftId) {
          setFailState({ draftId: fallbackDraftId, next });
        } else {
          toast({ title: "오류 발생", description: "잠시 후 다시 시도해주세요.", variant: "destructive" });
          navigate(next || "/input", { replace: true });
        }
      }
    };

    handleRedirect();
  }, [navigate, location, toast]);

  // Retry handler
  const handleRetry = async () => {
    if (!failState) return;
    setFailState(null);
    setMessage("다시 시도하는 중...");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const { data: { user } } = await supabase.auth.getUser();

    if (!accessToken || !user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      navigate("/login");
      return;
    }

    releaseLock(failState.draftId); // clear old lock
    const result = await attemptPromote(failState.draftId, accessToken, user.id);

    if (result.success && result.sessionId) {
      localStorage.removeItem("pending_draft_id");
      navigate(`/result/${result.sessionId}?type=session`, { replace: true });
    } else {
      setFailState(failState); // show fail UI again
    }
  };

  const handleViewAsDraft = () => {
    if (!failState) return;
    navigate(`/result/${failState.draftId}?type=draft`, { replace: true });
  };

  // Fail state UI
  if (failState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-muted-foreground text-sm">
            연결이 불안정할 수 있어요.
          </p>
          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full">
              다시 시도
            </Button>
            <Button variant="outline" onClick={handleViewAsDraft} className="w-full">
              그냥 결과 보기 (게스트)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin mx-auto"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
