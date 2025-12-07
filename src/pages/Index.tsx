import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, ArrowRight, FileText, Settings, PenTool } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-6">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Switch Manager</h1>
      </header>

      {/* Hero Section - Always Visible */}
      <main className="flex-1 flex flex-col px-6">
        <div className="w-full max-w-[430px] mx-auto">
          {/* Hero Content with Side-by-Side Layout */}
          <div className="flex items-start justify-between gap-6 mb-20">
            {/* Left: Text Content */}
            <div className="text-left max-w-[480px]">
              <h2 className="text-4xl md:text-5xl leading-tight font-black text-foreground tracking-[-0.02em] mb-4">
                당신의 일상,
                <br />
                커리어 자산이 되다
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                퇴근 후 스쳐간 생각도
                <br />
                말로 남기면 콘텐츠가 됩니다.
              </p>
            </div>

            {/* Right: Icon Visual */}
            <div className="flex items-center gap-4 opacity-75 flex-shrink-0">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-background border border-border shadow-sm">
                <Mic className="w-6 h-6 text-foreground" strokeWidth={1.5} />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground/40" strokeWidth={1.5} />
              <div className="grid grid-cols-2 gap-2">
                <div className="w-11 h-11 rounded-lg bg-[#03C75A] flex items-center justify-center shadow-sm">
                  <SiNaver className="w-5 h-5 text-white" />
                </div>
                <div className="w-11 h-11 rounded-lg bg-[#0077B5] flex items-center justify-center shadow-sm">
                  <SiLinkedin className="w-5 h-5 text-white" />
                </div>
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center shadow-sm">
                  <SiInstagram className="w-5 h-5 text-white" />
                </div>
                <div className="w-11 h-11 rounded-lg bg-black flex items-center justify-center shadow-sm">
                  <SiThreads className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Conditional Bottom Area */}
          {isReturningUser ? (
            <div className="space-y-3 pb-12">
              <p className="text-muted-foreground text-base font-medium mb-8">
                다시 오셨네요 👋
                <br />
                오늘은 무엇을 해볼까요?
              </p>
              
              <Card 
                className="cursor-pointer bg-background border border-border/30 shadow-sm hover:border-foreground hover:-translate-y-0.5 transition-all duration-200" 
                onClick={() => navigate('/input')}
              >
                <CardHeader className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0">
                      <PenTool className="w-5 h-5 text-background" strokeWidth={1.5} />
                    </div>
                    <div>
                      <CardTitle className="text-[15px] font-semibold text-foreground">새로운 기록 만들기</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">오늘의 생각을 바로 남겨보세요.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer bg-background border border-border/30 shadow-sm hover:border-foreground hover:-translate-y-0.5 transition-all duration-200" 
                onClick={() => navigate('/history')}
              >
                <CardHeader className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-background" strokeWidth={1.5} />
                    </div>
                    <div>
                      <CardTitle className="text-[15px] font-semibold text-foreground">그동안의 내 기록</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">이전 기록과 채널별 결과를 확인하세요.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer bg-background border border-border/30 shadow-sm hover:border-foreground hover:-translate-y-0.5 transition-all duration-200" 
                onClick={() => navigate('/settings')}
              >
                <CardHeader className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0">
                      <Settings className="w-5 h-5 text-background" strokeWidth={1.5} />
                    </div>
                    <div>
                      <CardTitle className="text-[15px] font-semibold text-foreground">프로필 설정</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">나의 기본 목적과 캐릭터를 수정합니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          ) : (
            <div className="pb-16">
              <Button
                onClick={() => navigate(isNewUser ? "/input" : "/login")}
                className="w-full h-14 text-[15px] font-semibold rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-sm"
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
