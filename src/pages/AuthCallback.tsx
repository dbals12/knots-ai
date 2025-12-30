import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. URL의 next 파라미터 확인 (우리가 로그인 시킨 경우)
    const searchParams = new URLSearchParams(location.search);
    const next = searchParams.get("next");

    // 2. 로컬 스토리지 확인 (백업용)
    const pendingDraftId = localStorage.getItem("pending_draft_id");

    const handleRedirect = async () => {
      // 세션 확정 대기
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // 로그인 실패 시 로그인 페이지로
        navigate("/login");
        return;
      }

      console.log("[AuthCallback] Logged in.", { next, pendingDraftId });

      if (next) {
        // 3-A. 명시된 next 경로가 있으면 거기로 이동 (Result Page)
        navigate(next, { replace: true });
      } else if (pendingDraftId) {
        // 3-B. next가 끊겼지만 로컬에 draft ID가 있으면 거기로 이동
        navigate(`/result/${pendingDraftId}`, { replace: true });
      } else {
        // 3-C. 아무것도 없으면 홈으로 (일반 로그인)
        navigate("/", { replace: true });
      }
    };

    handleRedirect();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">로그인 완료! 페이지 이동 중...</p>
    </div>
  );
};

export default AuthCallback;
