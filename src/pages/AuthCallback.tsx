import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleRedirect = async () => {
      const searchParams = new URLSearchParams(location.search);
      const next = searchParams.get("next");
      const pendingDraftId = localStorage.getItem("pending_draft_id");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/login");
        return;
      }

      try {
        // ✅ draft 결과에서 로그인한 케이스: next에 /result/...type=draft 가 있음
        const draftIdFromNext =
          next?.includes("/result/") && next?.includes("type=draft") ? next.match(/\/result\/([^?]+)/)?.[1] : null;

        const draftId = draftIdFromNext || pendingDraftId;

        if (draftId) {
          // ✅ 승격은 Edge Function 1번으로 처리
          const { data, error } = await supabase.functions.invoke("promote-draft", {
            body: { draft_id: draftId },
          });

          if (error) throw error;

          const sessionId = data?.session_id;
          if (sessionId) {
            // ✅ localStorage 정리
            localStorage.removeItem("pending_draft_id");
            // ✅ 세션 결과 화면으로 즉시 이동
            navigate(`/result/${sessionId}?type=session`, { replace: true });
            return;
          }
        }

        // 일반 로그인 흐름
        if (next) navigate(next, { replace: true });
        else navigate("/input", { replace: true });
      } catch (e) {
        console.error("[AuthCallback] promote failed:", e);
        if (next) navigate(next, { replace: true });
        else navigate("/input", { replace: true });
      }
    };

    handleRedirect();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">로그인 완료! 결과 불러오는 중...</p>
    </div>
  );
};

export default AuthCallback;
