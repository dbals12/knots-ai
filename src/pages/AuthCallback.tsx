import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState("로그인 완료! 결과 불러오는 중...");

  useEffect(() => {
    const handleRedirect = async () => {
      const searchParams = new URLSearchParams(location.search);
      const next = searchParams.get("next");
      const pendingDraftId = localStorage.getItem("pending_draft_id");

      // ✅ 세션 가져오기
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        toast({ title: "로그인이 필요합니다", description: "다시 로그인해 주세요.", variant: "destructive" });
        navigate("/login");
        return;
      }

      // ✅ users 테이블 보장 (신규 유저일 경우 생성)
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

      try {
        // ✅ 케이스 A: next URL에서 draft_id 추출 → 자동 승격
        if (next && next.includes("/result/") && next.includes("type=draft")) {
          const m = next.match(/\/result\/([^?]+)/);
          const draftIdFromNext = m?.[1];

          if (draftIdFromNext) {
            setMessage("결과를 저장하는 중...");

            const { data, error } = await supabase.functions.invoke("promote-draft", {
              body: { draft_id: draftIdFromNext },
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!error && data?.session_id) {
              localStorage.removeItem("pending_draft_id");
              // ✅ 세션 기반 URL로 즉시 이동
              navigate(`/result/${data.session_id}?type=session`, { replace: true });
              return;
            } else {
              console.error("[AuthCallback] promote-draft failed:", error, data);
              toast({ title: "승격 실패", description: "결과 저장에 실패했습니다. 다시 시도해주세요.", variant: "destructive" });
              // 승격 실패해도 draft 결과로는 보내줌
              navigate(next, { replace: true });
              return;
            }
          }
        }

        // ✅ 케이스 B: next 없지만 pendingDraftId가 있으면 승격 시도
        if (!next && pendingDraftId) {
          setMessage("결과를 저장하는 중...");

          const { data, error } = await supabase.functions.invoke("promote-draft", {
            body: { draft_id: pendingDraftId },
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!error && data?.session_id) {
            localStorage.removeItem("pending_draft_id");
            navigate(`/result/${data.session_id}?type=session`, { replace: true });
            return;
          } else {
            console.error("[AuthCallback] promote-draft failed:", error, data);
            toast({ title: "승격 실패", description: "결과 저장에 실패했습니다.", variant: "destructive" });
            // 승격 실패 시 draft 결과로
            navigate(`/result/${pendingDraftId}?type=draft`, { replace: true });
            return;
          }
        }

        // ✅ 일반 로그인 흐름 (next가 있으면 해당 위치로)
        if (next) {
          navigate(next, { replace: true });
        } else {
          navigate("/input", { replace: true });
        }
      } catch (e) {
        console.error("[AuthCallback] promote failed:", e);
        toast({ title: "오류 발생", description: "잠시 후 다시 시도해주세요.", variant: "destructive" });
        // 승격 실패해도 next로는 보내주기
        if (next) navigate(next, { replace: true });
        else navigate("/input", { replace: true });
      }
    };

    handleRedirect();
  }, [navigate, location, toast]);

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
