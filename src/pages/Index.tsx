import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Mic, FileText, Settings, PenTool, ArrowRight } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import Home from "./Home";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hasPreviousSession, setHasPreviousSession] = useState(false);
  const [sessionCheckLoading, setSessionCheckLoading] = useState(true);

  // 1. 로그인 직후 리다이렉트 처리 (게스트 기록이 있는 경우)
  useEffect(() => {
    const pendingDraftId = localStorage.getItem("pending_draft_id");
    if (user && pendingDraftId) {
      console.log("[Index] Pending draft found. Redirecting:", pendingDraftId);
      navigate(`/result/${pendingDraftId}`, { replace: true });
      return;
    }
  }, [user, navigate]);

  // 2. 유저 타입 확인 (재방문 vs 신규) - drafts 테이블 추가 확인!
  useEffect(() => {
    const checkSessions = async () => {
      const pendingDraftId = localStorage.getItem("pending_draft_id");

      // 로그인이 안 되어 있거나, 곧바로 리다이렉트될 예정이면 체크 스킵
      if (!user || pendingDraftId) {
        setSessionCheckLoading(false);
        return;
      }

      try {
        // ✅ [수정] sessions 테이블과 drafts 테이블을 모두 확인하여 "기록이 하나라도 있는지" 체크
        // Promise.all로 병렬 처리하여 속도 최적화
        const [sessionsResult, draftsResult] = await Promise.all([
          supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("drafts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        const sessionCount = sessionsResult.count || 0;
        const draftCount = draftsResult.count || 0;

        // 둘 중 하나라도 기록이 있으면 "재방문 유저"로 판단
        setHasPreviousSession(sessionCount > 0 || draftCount > 0);
      } catch (error) {
        console.error("Error checking user history:", error);
      } finally {
        setSessionCheckLoading(false);
      }
    };

    checkSessions();
  }, [user]);

  const isAuthenticated = !!user;

  // 로딩 화면
  if (loading || (user && sessionCheckLoading)) {
    // 리다이렉트 대기 중이면 로딩 표시 생략 (깜빡임 방지)
    if (localStorage.getItem("pending_draft_id")) return null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // 게스트(비로그인) 유저 -> 바로 Input 화면(Home) 렌더링
  if (!isAuthenticated) {
    return <Home isGuest={true} />;
  }

  // ✅ 재방문 유저 (기록 있음) -> 대시보드 화면 표시
  if (hasPreviousSession) {
    return (
      <AppShell showHeader={false}>
        <div className="px-6 py-10 flex flex-col flex-1 justify-between min-h-full">
          {/* Top Content Section */}
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-normal text-foreground tracking-wide font-jost">knots</h1>
            </div>

            <div className="text-left mb-10">
              <h2 className="text-3xl md:text-3xl font-normal leading-snug tracking-tight text-foreground text-left">
                생각만 하세요
                <br />
                기록은 제가 할게요
              </h2>

              <p className="mt-6 mb-16 font-normal leading-normal text-[11px] md:text-xs w-full space-y-0.5">
                <span className="block text-left text-transparent bg-clip-text bg-gradient-to-r from-gray-600 via-gray-500 to-gray-500 whitespace-nowrap">
                  말하는 대로 완성되는 나만의 커리어 콘텐츠
                </span>
                <span className="block text-left text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-gray-600 to-gray-500 whitespace-nowrap tracking-tighter">
                  블로그, 링크드인, 인스타, 쓰레드까지 AI가 알아서 정리해드립니다.
                </span>
              </p>
            </div>

            {/* Mic + Channel Icons Area */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                <Mic className="w-6 h-6 text-foreground" strokeWidth={1.5} />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="grid grid-cols-2 gap-2">
                <div className="w-11 h-11 rounded-xl bg-[#F8F8F8] flex items-center justify-center">
                  <SiNaver className="w-4 h-4 text-foreground" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#F8F8F8] flex items-center justify-center">
                  <SiLinkedin className="w-5 h-5 text-foreground" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#F8F8F8] flex items-center justify-center">
                  <SiInstagram className="w-5 h-5 text-foreground" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#F8F8F8] flex items-center justify-center">
                  <SiThreads className="w-5 h-5 text-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Section */}
          <div className="flex flex-col">
            <p className="text-center text-muted-foreground text-xs mb-5">
              다시 오셨네요 👋 오늘은 어떤 기록을 남겨볼까요?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/input")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                  <PenTool className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-normal text-foreground">새로운 기록 만들기</div>
                  <div className="text-xs text-muted-foreground mt-0.5">오늘의 생각을 바로 남겨보세요</div>
                </div>
              </button>

              <button
                onClick={() => navigate("/history")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F0F0F0] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-normal text-foreground">내 기록 모아보기</div>
                  <div className="text-xs text-muted-foreground mt-0.5">이전 기록과 결과를 확인하세요</div>
                </div>
              </button>

              <button
                onClick={() => navigate("/settings")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F0F0F0] flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-normal text-foreground">내 정보 설정</div>
                  <div className="text-xs text-muted-foreground mt-0.5">기본 목적과 캐릭터를 수정합니다</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // 신규 가입 유저 (기록 0개) -> Input 화면으로 이동
  return <Home isGuest={false} />;
};

export default Index;
