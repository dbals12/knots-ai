import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Mic, FileText, Settings, PenTool, ArrowRight } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import Landing from "./Landing";
import Home from "./Home";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hasPreviousSession, setHasPreviousSession] = useState(false);
  const [sessionCheckLoading, setSessionCheckLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(false);

  // Check if user has seen landing before
  useEffect(() => {
    const hasSeenLanding = sessionStorage.getItem("knots_seen_landing");
    if (!hasSeenLanding && !user) {
      setShowLanding(true);
      sessionStorage.setItem("knots_seen_landing", "true");
    }
  }, [user]);

  useEffect(() => {
    const pendingDraftId = localStorage.getItem("pending_draft_id");
    if (user && pendingDraftId) {
      console.log("[Index] Pending draft found. Redirecting:", pendingDraftId);
      navigate(`/result/${pendingDraftId}`, { replace: true });
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const checkSessions = async () => {
      const pendingDraftId = localStorage.getItem("pending_draft_id");
      if (!user || pendingDraftId) {
        setSessionCheckLoading(false);
        return;
      }
      try {
        const [sessionsResult, draftsResult] = await Promise.all([
          supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("drafts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        const sessionCount = sessionsResult.count || 0;
        const draftCount = draftsResult.count || 0;
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

  if (loading || (user && sessionCheckLoading)) {
    if (localStorage.getItem("pending_draft_id")) return null;
    return (
      <div className="min-h-screen flex items-center justify-center warm-gradient-bg">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // Show landing for first-time guests
  if (showLanding && !isAuthenticated) {
    return <Landing />;
  }

  // Guest → Input screen
  if (!isAuthenticated) {
    return <Home isGuest={true} />;
  }

  // Returning user dashboard
  if (hasPreviousSession) {
    return (
      <AppShell showHeader={false}>
        <div className="px-6 py-8 flex flex-col flex-1 justify-between">
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
                <span className="block text-left text-muted-foreground whitespace-nowrap">
                  말하는 대로 완성되는 나만의 커리어 콘텐츠
                </span>
                <span className="block text-left text-muted-foreground whitespace-nowrap tracking-tighter">
                  블로그, 링크드인, 인스타, 쓰레드까지 AI가 알아서 정리해드립니다.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 mb-12">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-background/80 shadow-[0_4px_16px_hsla(0,0%,0%,0.08)] backdrop-blur-sm">
                <Mic className="w-6 h-6 text-foreground" strokeWidth={1.5} />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="grid grid-cols-2 gap-2">
                {[SiNaver, SiLinkedin, SiInstagram, SiThreads].map((Icon, i) => (
                  <div key={i} className="w-11 h-11 rounded-xl bg-muted/50 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-center text-muted-foreground text-xs mb-5">
              다시 오셨네요 👋 오늘은 어떤 기록을 남겨볼까요?
            </p>
            <div className="space-y-3">
              {[
                { icon: PenTool, label: "새로운 기록 만들기", desc: "오늘의 생각을 바로 남겨보세요", path: "/input", dark: true },
                { icon: FileText, label: "내 기록 모아보기", desc: "이전 기록과 결과를 확인하세요", path: "/history", dark: false },
                { icon: Settings, label: "내 정보 설정", desc: "맞춤화된 결과를 위해 프로필을 설정하세요", path: "/settings", dark: false },
              ].map(({ icon: Icon, label, desc, path, dark }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl glass-card hover:shadow-md transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${dark ? "bg-foreground" : "bg-muted/60"}`}>
                    <Icon className={`w-4 h-4 ${dark ? "text-background" : "text-foreground"}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // New user → Input
  return <Home isGuest={false} />;
};

export default Index;
