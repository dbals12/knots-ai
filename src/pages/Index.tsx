import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/input");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5">
        <h1 className="text-lg font-bold text-foreground tracking-tight">Switch Manager</h1>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 pb-32">
        <div className="w-full max-w-[430px] mx-auto space-y-12">
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
            {/* Input: Mic Icon */}
            <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white shadow-xl border-2 border-border">
              <Mic className="w-9 h-9 text-foreground" strokeWidth={2.5} />
            </div>

            {/* Arrow */}
            <ArrowRight className="w-7 h-7 text-muted-foreground flex-shrink-0" strokeWidth={2} />

            {/* Output: 2x2 Grid of Platform Icons */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Blog - Naver Green */}
              <div className="w-[58px] h-[58px] rounded-xl bg-[#03C75A] flex items-center justify-center shadow-lg">
                <SiNaver className="w-7 h-7 text-white" />
              </div>

              {/* LinkedIn - Blue */}
              <div className="w-[58px] h-[58px] rounded-xl bg-[#0077B5] flex items-center justify-center shadow-lg">
                <SiLinkedin className="w-7 h-7 text-white" />
              </div>

              {/* Reels - Instagram Gradient */}
              <div className="w-[58px] h-[58px] rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center shadow-lg">
                <SiInstagram className="w-7 h-7 text-white" />
              </div>

              {/* Threads - Black */}
              <div className="w-[58px] h-[58px] rounded-xl bg-black flex items-center justify-center shadow-lg">
                <SiThreads className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="w-full max-w-[430px] mx-auto pointer-events-auto">
          <Button
            onClick={() => navigate("/login")}
            className="w-full h-14 text-[15px] font-semibold rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-xl"
          >
            지금 바로 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
