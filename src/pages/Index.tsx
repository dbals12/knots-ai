import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, FileText, Settings, PenTool, BookOpen, Briefcase, Camera, MessageCircle } from "lucide-react";

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
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) throw error;
        setHasPreviousSession(sessions && sessions.length > 0);
      } catch (error) {
        console.error('Error checking sessions:', error);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Bolder Logo */}
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-lg font-bold text-foreground tracking-tight">Switch Manager</h1>
      </header>

      {/* Main Content - Dense Mobile App Layout */}
      <main className="flex-1 flex flex-col px-5">
        <div className="w-full max-w-[430px] mx-auto flex flex-col flex-1">
          
          {/* Hero Block - Left Aligned, Compact */}
          <div className="text-left mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight leading-tight mb-2">
              당신의 일상을<br />커리어 자산으로.
            </h2>
            <p className="text-sm text-muted-foreground leading-snug">
              말로 남긴 생각을<br />블로그, 링크드인, 인스타 콘텐츠로 바꿔드립니다.
            </p>
          </div>

          {/* Icon Visual - Monochrome Black & White */}
          <div className="flex items-center gap-4 mb-8">
            {/* Mic Icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl border border-border bg-background">
              <Mic className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </div>
            
            <div className="text-muted-foreground text-lg">→</div>
            
            {/* Platform Grid - All Black Icons */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="w-11 h-11 rounded-xl border border-border bg-background flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div className="w-11 h-11 rounded-xl border border-border bg-background flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div className="w-11 h-11 rounded-xl border border-border bg-background flex items-center justify-center">
                <Camera className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div className="w-11 h-11 rounded-xl border border-border bg-background flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Conditional Content Area */}
          {isReturningUser ? (
            <div className="flex-1 flex flex-col">
              {/* Greeting - Compact */}
              <p className="text-muted-foreground text-sm mb-5">
                다시 오셨네요 👋 오늘은 어떤 기록을 남겨볼까요?
              </p>
              
              {/* Dashboard List - Dense */}
              <div className="space-y-2.5 flex-1">
                {/* Primary Action */}
                <button 
                  onClick={() => navigate('/input')}
                  className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-border bg-background hover:border-foreground/40 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                    <PenTool className="w-4 h-4 text-background" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">새로운 기록 만들기</div>
                    <div className="text-xs text-muted-foreground mt-0.5">오늘의 생각을 바로 남겨보세요</div>
                  </div>
                </button>

                {/* Secondary Actions */}
                <button 
                  onClick={() => navigate('/history')}
                  className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-border bg-background hover:border-foreground/40 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">내 기록 모아보기</div>
                    <div className="text-xs text-muted-foreground mt-0.5">이전 기록과 결과를 확인하세요</div>
                  </div>
                </button>

                <button 
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-border bg-background hover:border-foreground/40 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center flex-shrink-0">
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
            <div className="flex-1 flex flex-col justify-end pb-10">
              <Button
                onClick={() => navigate(isNewUser ? "/input" : "/login")}
                className="w-full h-14 text-base font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                {isNewUser ? '첫 기록 시작하기' : '지금 바로 시작하기'}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;