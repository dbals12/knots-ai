import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, ArrowRight, FileText, Settings, PenTool, BookOpen, Briefcase, Camera, MessageCircle } from "lucide-react";

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
      {/* Header */}
      <header className="px-6 py-6">
        <h1 className="text-base font-medium text-foreground tracking-tight">Switch Manager</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-6 pb-12">
        <div className="w-full max-w-[430px] mx-auto">
          
          {/* Hero Block - Left Aligned */}
          <div className="text-left mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight leading-snug mb-4">
              당신의 일상을<br />커리어 자산으로.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              말로 남긴 생각을<br />블로그, 링크드인, 인스타 콘텐츠로 바꿔드립니다.
            </p>
          </div>

          {/* Icon Visual - Black & White Minimal */}
          <div className="flex items-center justify-start gap-6 mb-16">
            {/* Mic Icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl border border-border bg-background shadow-sm">
              <Mic className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </div>
            
            <ArrowRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            
            {/* Platform Grid - Black Icons */}
            <div className="grid grid-cols-2 gap-2">
              <div className="w-12 h-12 rounded-xl border border-border bg-background flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div className="w-12 h-12 rounded-xl border border-border bg-background flex items-center justify-center shadow-sm">
                <Briefcase className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div className="w-12 h-12 rounded-xl border border-border bg-background flex items-center justify-center shadow-sm">
                <Camera className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div className="w-12 h-12 rounded-xl border border-border bg-background flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Conditional Bottom Area */}
          {isReturningUser ? (
            <div>
              {/* Greeting */}
              <p className="text-muted-foreground text-sm mb-8">
                다시 오셨네요 👋 오늘은 어떤 기록을 남겨볼까요?
              </p>
              
              {/* Dashboard Cards */}
              <div className="space-y-3">
                {/* Primary Action Card */}
                <Card 
                  className="cursor-pointer bg-background border border-border hover:border-foreground/30 transition-all duration-200" 
                  onClick={() => navigate('/input')}
                >
                  <CardHeader className="py-5 px-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                        <PenTool className="w-4 h-4 text-background" strokeWidth={1.5} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-foreground">새로운 기록 만들기</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">오늘의 생각을 바로 남겨보세요.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Secondary Action Cards */}
                <Card 
                  className="cursor-pointer bg-background border border-border hover:border-foreground/30 transition-all duration-200" 
                  onClick={() => navigate('/history')}
                >
                  <CardHeader className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-foreground">내 기록 모아보기</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">이전 기록과 결과를 확인하세요.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card 
                  className="cursor-pointer bg-background border border-border hover:border-foreground/30 transition-all duration-200" 
                  onClick={() => navigate('/settings')}
                >
                  <CardHeader className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center flex-shrink-0">
                        <Settings className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-foreground">내 정보 설정</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">기본 목적과 캐릭터를 수정합니다.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>
          ) : (
            <div>
              <Button
                onClick={() => navigate(isNewUser ? "/input" : "/login")}
                className="w-full h-12 text-sm font-medium rounded-xl bg-foreground text-background hover:bg-foreground/90"
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