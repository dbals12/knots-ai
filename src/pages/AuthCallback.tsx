import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const promoteDraftToSession = async (draftId: string, userId: string) => {
      // 1) draft 읽기
      const { data: draft, error: draftErr } = await supabase
        .from("drafts")
        .select("id, input_data, result_data, status")
        .eq("id", draftId)
        .single();

      if (draftErr || !draft) throw new Error(draftErr?.message || "draft not found");
      if (draft.status !== "completed") throw new Error("draft not completed");

      const inputData: any = draft.input_data || {};
      const resultData: any = draft.result_data || {};

      const rawText = resultData?.transcript || inputData?.textInput || "";

      // 2) sessions 생성 (회원용)
      const { data: sessionRow, error: sessionErr } = await supabase
        .from("sessions")
        .insert({
          user_id: userId,
          input_type: inputData?.inputMode || "text",
          raw_text: rawText,
          // 필요하면 아래도 넣어도 됨 (테이블 컬럼이 있을 때만)
          // user_persona: inputData?.selectedPersona,
          // user_mood: inputData?.selectedMood,
          // session_purpose: inputData?.sessionPurpose,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sessionErr || !sessionRow) throw new Error(sessionErr?.message || "session insert failed");

      const sessionId = sessionRow.id;

      // 3) outputs 4개 생성
      const rows = [
        { session_id: sessionId, platform_type: "blog", generated_content: resultData.blog_content || "" },
        { session_id: sessionId, platform_type: "linkedin", generated_content: resultData.linkedin_content || "" },
        { session_id: sessionId, platform_type: "reels", generated_content: resultData.reels_content || "" },
        { session_id: sessionId, platform_type: "threads", generated_content: resultData.threads_content || "" },
      ];

      const { error: outErr } = await supabase.from("outputs").insert(rows);
      if (outErr) throw new Error(outErr.message || "outputs insert failed");

      // 4) (선택) events 로깅: funnel 분석용
      // events 테이블 컬럼명이 다를 수 있어. 네 스키마에 맞게만 쓰면 됨.
      await supabase
        .from("events")
        .insert({
          user_id: userId,
          event_name: "promote_draft_to_session",
          draft_id: draftId,
          session_id: sessionId,
          created_at: new Date().toISOString(),
        })
        .catch(() => {});

      // 5) (선택) draft에 session_id 기록해두면 중복승격 방지 가능(컬럼 있을 때만)
      // await supabase.from("drafts").update({ session_id: sessionId }).eq("id", draftId);

      return sessionId;
    };

    const handleRedirect = async () => {
      const searchParams = new URLSearchParams(location.search);
      const next = searchParams.get("next");
      const pendingDraftId = localStorage.getItem("pending_draft_id");

      // 세션 확정 대기
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/login");
        return;
      }

      const userId = session.user.id;

      try {
        // ✅ 케이스: 결과(draft)에서 로그인한 경우 → 자동 승격
        if (next && next.includes("/result/") && next.includes("type=draft")) {
          // next 예: /result/xxxx?type=draft
          const m = next.match(/\/result\/([^?]+)/);
          const draftIdFromNext = m?.[1];

          if (draftIdFromNext) {
            const sessionId = await promoteDraftToSession(draftIdFromNext, userId);

            // ✅ 세션 결과 화면으로 이동
            navigate(`/result/${sessionId}?type=session`, { replace: true });
            return;
          }
        }

        // ✅ 백업: localStorage에 draft id가 있으면 그것도 승격 시도
        if (!next && pendingDraftId) {
          const sessionId = await promoteDraftToSession(pendingDraftId, userId);
          navigate(`/result/${sessionId}?type=session`, { replace: true });
          return;
        }

        // 일반 로그인 흐름
        if (next) {
          navigate(next, { replace: true });
        } else {
          navigate("/input", { replace: true });
        }
      } catch (e: any) {
        // 승격 실패해도 최소한 next로는 보내주기
        console.error("[AuthCallback] promote failed:", e?.message || e);
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
