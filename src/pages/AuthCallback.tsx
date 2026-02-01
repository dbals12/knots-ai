import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAccessToken } from "@/lib/edgeFunctionAuth";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleRedirect = async () => {
      const searchParams = new URLSearchParams(location.search);
      const next = searchParams.get("next");
      const pendingDraftId = localStorage.getItem("pending_draft_id");

      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast({ title: "로그인이 필요합니다", description: "다시 로그인해 주세요.", variant: "destructive" });
        navigate("/login");
        return;
      }

      try {
        // ✅ 케이스 A: 결과(draft)에서 로그인한 경우 -> promote-draft 호출
        if (next && next.includes("/result/") && next.includes("type=draft")) {
          const m = next.match(/\/result\/([^?]+)/);
          const draftIdFromNext = m?.[1];

          if (draftIdFromNext) {
            const { data, error } = await supabase.functions.invoke("promote-draft", {
              body: { draft_id: draftIdFromNext },
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!error && data?.session_id) {
              // ✅ session 결과로 이동
              localStorage.removeItem("pending_draft_id");
              navigate(`/result/${data.session_id}?type=session`, { replace: true });
              return;
            }
          }
        }

        // ✅ 케이스 B: next가 없지만 pendingDraftId가 있으면 승격 시도
        if (!next && pendingDraftId) {
          const { data, error } = await supabase.functions.invoke("promote-draft", {
            body: { draft_id: pendingDraftId },
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!error && data?.session_id) {
            localStorage.removeItem("pending_draft_id");
            navigate(`/result/${data.session_id}?type=session`, { replace: true });
            return;
          }
        }

        // ✅ 일반 로그인 흐름
        if (next) {
          navigate(next, { replace: true });
        } else {
          navigate("/input", { replace: true });
        }
      } catch (e) {
        console.error("[AuthCallback] promote failed:", e);
        // 승격 실패해도 next로는 보내주기
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
