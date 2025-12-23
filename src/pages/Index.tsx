import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPendingSubmission } from "@/lib/pendingSubmission";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import { Mic, FileText, Settings, PenTool, ArrowRight, Loader2 } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import Home from "./Home";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hasPreviousSession, setHasPreviousSession] = useState(false);
  const [sessionCheckLoading, setSessionCheckLoading] = useState(true);

  // Global-ish safety net: if a guest draft exists when a user lands here after login,
  // immediately redirect to /processing and show a spinner (avoid showing dashboard CTA buttons).
  const [autoRestorePending] = useState(() => {
    try {
      return typeof window !== "undefined" && !!window.localStorage.getItem("guest_pending_submission");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!user) return;
    if (!autoRestorePending) return;

    const raw = window.localStorage.getItem("guest_pending_submission");
    console.log("[home-auto-submit] Draft check on mount:", { hasDraft: !!raw });

    if (!raw) return;

    console.log("[home-auto-submit] Draft found! Redirecting to /processing...");
    navigate("/processing", { replace: true });
  }, [autoRestorePending, navigate, user]);

  useEffect(() => {
    const checkSessions = async () => {
      if (!user) {
        setSessionCheckLoading(false);
        return;
      }

      // If there's a pending submission, we won't show the dashboard anyway.
      if (getPendingSubmission()) {
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
  const pendingSubmission = isAuthenticated ? getPendingSubmission() : null;
  const isReturningUser = isAuthenticated && hasPreviousSession;

  if (loading || (user && sessionCheckLoading && !pendingSubmission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // If a guest draft exists, show loading immediately and let /processing handle the generation.
  if (isAuthenticated && autoRestorePending) {
    return (
      <AppShell showHeader={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-foreground" />
          <p className="text-sm text-muted-foreground">분석 중입니다...</p>
        </div>
      </AppShell>
    );
  }

  // If the user just logged in and has a pending submission, jump straight into processing.
  if (isAuthenticated && pendingSubmission) {
    return <Home isGuest={false} />;
  }

  // Guest users: render Input Page directly
  if (!isAuthenticated) {
    return <Home isGuest={true} />;
  }

  // Returning users: show dashboard
  if (isReturningUser) {
    return (
      <AppShell showHeader={false}>
        <div className="px-6 py-10 flex flex-col flex-1 justify-between min-h-full">
          {/* Top Content Section */}
          <div>
            {/* Top Brand Row - Centered */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-normal text-foreground tracking-wide font-jost">knots</h1>
            </div>

            {/* Main Headline + Subcopy - Left Aligned */}
            <div className="text-left mb-10">
              <h2 className="text-3xl md:text-3xl font-normal leading-snug tracking-tight text-foreground text-left">
                생각만 하세요
                <br />
                기록은 제가 할게요
              </h2>

              {/* 서브타이틀 수정 */}
              <p className="mt-6 mb-16 font-normal leading-normal text-[11px] md:text-xs w-full space-y-0.5">
                {/* 첫째줄: 연하게 -> 진하게 */}
                <span className="block text-left text-transparent bg-clip-text bg-gradient-to-r from-gray-600 via-gray-500 to-gray-500 whitespace-nowrap">
                  말하는 대로 완성되는 나만의 커리어 콘텐츠
                </span>

                {/* 둘째줄: 진하게 -> 연하게 */}
                <span className="block text-left text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-gray-600 to-gray-500 whitespace-nowrap tracking-tighter">
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
            {/* Welcome Text - Centered */}
            <p className="text-center text-muted-foreground text-xs mb-5">
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
                  <div className="text-sm font-normal text-foreground">새로운 기록 만들기</div>
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

  // New authenticated user: go to input page
  return <Home isGuest={false} />;
};

export default Index;
