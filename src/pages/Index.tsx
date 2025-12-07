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
      <header className="px-6 py-5">
        <h1 className="text-lg font-bold text-foreground tracking-tight">Switch Manager</h1>
      </header>

      {/* Hero Section - Always Visible */}
      <main className="flex-1 flex flex-col px-6">
        <div className="w-full max-w-[430px] mx-auto space-y-8">
          {/* Headline */}
          <div className="space-y-4 text-center">
            <h3 className="text-[42px] leading-[1.1] font-black text-foreground tracking-tight">
              당신의 일상을
              <br />
              커리어 자산으로
            </h3>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              <br />
              퇴근 후 쓰러져도, 커리어 브랜딩은 포기하지 마세요.
              <br />
              <br />
              휘발되는 생각들을 말로만 남기면,
              <br />
              블로그·링크드인·릴스·쓰레드 콘텐츠로 정리해 드립니다.
            </p>
          </div>

          {/* Transformation Visual */}
          <div className="flex items-center justify-center gap-5">
            <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white shadow-xl border-2 border-border">
              <Mic className="w-9 h-9 text-foreground" strokeWidth={2.5} />
            </div>
            <ArrowRight className="w-7 h-7 text-muted-foreground flex-shrink-0" strokeWidth={2} />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="w-[58px] h-[58px] rounded-xl bg-[#03C75A] flex items-center justify-center shadow-lg">
                <SiNaver className="w-7 h-7 text-white" />
              </div>
              <div className="w-[58px] h-[58px] rounded-xl bg-[#0077B5] flex items-center justify-center shadow-lg">
                <SiLinkedin className="w-7 h-7 text-white" />
              </div>
              <div className="w-[58px] h-[58px] rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center shadow-lg">
                <SiInstagram className="w-7 h-7 text-white" />
              </div>
              <div className="w-[58px] h-[58px] rounded-xl bg-black flex items-center justify-center shadow-lg">
                <SiThreads className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* Conditional Bottom Area */}
          {isReturningUser ? (
            <div className="space-y-4 pt-4 pb-8">
              <p className="text-center text-muted-foreground text-sm">다시 오셨네요 👋 오늘은 무엇을 해볼까요?</p>
              
              <Card className="cursor-pointer hover:shadow-lg transition-all border-2" onClick={() => navigate('/input')}>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                      <PenTool className="w-5 h-5 text-background" />
                    </div>
                    <div>
                      <CardTitle className="text-base">새로운 기록 만들기</CardTitle>
                      <CardDescription className="text-xs">오늘의 하루를 새로 기록합니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-all border-2" onClick={() => navigate('/history')}>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-background" />
                    </div>
                    <div>
                      <CardTitle className="text-base">그동안의 내 기록 확인하기</CardTitle>
                      <CardDescription className="text-xs">지난 기록과 채널별 결과를 확인합니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-all border-2" onClick={() => navigate('/settings')}>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                      <Settings className="w-5 h-5 text-background" />
                    </div>
                    <div>
                      <CardTitle className="text-base">프로필 설정</CardTitle>
                      <CardDescription className="text-xs">온보딩에서 정한 목적과 캐릭터를 수정합니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          ) : (
            <div className="pt-8 pb-12">
              <Button
                onClick={() => navigate(isNewUser ? "/input" : "/login")}
                className="w-full h-14 text-[15px] font-semibold rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-xl"
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
