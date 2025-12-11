import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import { Mic, FileText, Settings, PenTool, ArrowRight } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hasPreviousSession, setHasPreviousSession] = useState(false);
  const [sessionCheckLoading, setSessionCheckLoading] = useState(true);

  useEffect(() => {
    const checkSessions = async () => {
      if (!user) {
        setSessionCheckLoading(false);
        return;
      }

      try {
        const { data: sessions, error } = await supabase.from("sessions").select("id").eq("user_id", user.id).limit(1);

        if (error) throw error;
        setHasPreviousSession(sessions && sessions.length > 0);
      } catch (error) {
        console.error("Error checking sessions:", error);
      } finally {
        setSessionCheckLoading(false);
      }
    };

    checkSessions();
  }, [user]);

  const isAuthenticated = !!user;
  const isNewUser = isAuthenticated && !hasPreviousSession;
  const isReturningUser = isAuthenticated && hasPreviousSession;

  if (loading || (user && sessionCheckLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <AppShell showHeader={false}>
      <div className="px-6 py-10 flex flex-col flex-1 justify-between min-h-full">
        {/* Top Content Section */}
        <div>
          {/* Top Brand Row - Centered */}
          <div className="text-center mb-8">
            <h1 className="text-base font-bold text-foreground tracking-tight">Switch Manager</h1>
          </div>

          {/* Main Headline + Subcopy - Left Aligned */}
          <div className="text-left mb-8">
            <h2 className="text-3xl md:text-3xl font-black leading-relaxed tracking-tight text-black text-left">
              생각만 하세요
              <br />
              기록은 제가 할게요
            </h2>

            {/* 서브타이틀 수정 */}
            {/* text-xs(12px)보다 살짝 더 작은 text-[11px]로 조정하여 안전하게 한 줄 처리 */}
            <p className="mt-6 font-medium leading-7 text-[11px] md:text-xs w-full space-y-2">
              {/* 첫째줄: 연하게 -> 진하게 */}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gray-300 via-gray-350 to-gray-300 whitespace-nowrap">
                말하는 대로 완성되는 나만의 커리어 콘텐츠.
              </span>

              {/* 둘째줄: 진하게 -> 연하게 */}
              {/* whitespace-nowrap: 강제 줄바꿈 금지 / tracking-tighter: 자간 좁힘 */}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 whitespace-nowrap tracking-tighter">
                블로그, 링크드인, 인스타, 쓰레드까지 AI가 알아서 정리해드립니다.
              </span>
            </p>
          </div>

          {/* Mic + Channel Icons Area - Centered */}
          <div className="flex items-center justify-center gap-4 mb-12">
            {/* Mic Icon with shadow */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
              <Mic className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </div>

            {/* Arrow */}
            <ArrowRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />

            {/* Platform Grid - 2x2 with real platform icons in B&W */}
            <div className="grid grid-cols-2 gap-2">
              <div className="w-11 h-11 rounded-xl bg-[#F8F8F8] flex items-center justify-center">
                <SiNaver className="w-5 h-5 text-foreground" />
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
        {isReturningUser ? (
          <div className="flex flex-col">
            {/* Welcome Text - Centered */}
            <p className="text-center text-muted-foreground text-sm mb-5">
              다시 오셨네요 👋 오늘은 어떤 기록을 남겨볼까요?
            </p>

            {/* Dashboard Action Blocks */}
            <div className="space-y-3">
              {/* Primary Action */}
              <button
                onClick={() => navigate("/input")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                  <PenTool className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">새로운 기록 만들기</div>
                  <div className="text-xs text-muted-foreground mt-0.5">오늘의 생각을 바로 남겨보세요</div>
                </div>
              </button>

              {/* Secondary Actions */}
              <button
                onClick={() => navigate("/history")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F0F0F0] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">내 기록 모아보기</div>
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
                  <div className="text-sm font-semibold text-foreground">내 정보 설정</div>
                  <div className="text-xs text-muted-foreground mt-0.5">기본 목적과 캐릭터를 수정합니다</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <Button
              onClick={() => navigate(isNewUser ? "/input" : "/login")}
              className="w-full h-14 text-base font-semibold rounded-full bg-foreground text-white hover:bg-foreground/90"
            >
              {isNewUser ? "첫 기록 시작하기" : "지금 바로 시작하기"}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Index;
