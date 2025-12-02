import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight, FileText, Linkedin, Video } from "lucide-react";

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
            <h2 className="text-[42px] leading-[1.1] font-black text-foreground tracking-tight">
              당신의 일상을
              <br />
              커리어 자산으로
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
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
              <div className="w-[58px] h-[58px] rounded-xl bg-blog flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>

              {/* LinkedIn - Blue */}
              <div className="w-[58px] h-[58px] rounded-xl bg-linkedin flex items-center justify-center shadow-lg">
                <Linkedin className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>

              {/* Reels - Instagram Gradient */}
              <div className="w-[58px] h-[58px] rounded-xl bg-reels-gradient flex items-center justify-center shadow-lg">
                <Video className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>

              {/* Threads - Black */}
              <div className="w-[58px] h-[58px] rounded-xl bg-threads flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12.186 3.004c1.456-.003 2.64.202 3.636.65.993.446 1.763 1.145 2.3 2.102.534.952.793 2.143.773 3.572h-3.091c.014-.857-.161-1.55-.524-2.078-.363-.528-.898-.875-1.605-1.04-.707-.165-1.574-.179-2.6-.042-1.027.137-1.897.47-2.61 1-1.427.906-2.278 2.45-2.554 4.63-.276 2.18.054 3.973.989 5.378.935 1.405 2.353 2.183 4.254 2.334 1.26.1 2.33-.065 3.21-.493.88-.428 1.545-1.058 1.995-1.89.45-.832.67-1.838.66-3.02H12v-2.5h7c.007.203.01.405.01.607 0 2.013-.39 3.795-1.17 5.345-.78 1.55-1.91 2.756-3.39 3.62-1.48.864-3.23 1.296-5.25 1.296-2.407 0-4.434-.56-6.08-1.68C1.473 19.767.442 18.177 0 15.81c-.442-2.367-.208-4.54.702-6.516.91-1.976 2.34-3.473 4.29-4.49C6.943 3.787 9.178 3.008 12.186 3.004z"
                    fill="currentColor"
                  />
                </svg>
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
