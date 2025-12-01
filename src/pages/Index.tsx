import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { FileText, Linkedin, Video, MessageSquare, ArrowRight } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/input');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Switch Manager</h1>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/login')}
          >
            로그인
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center space-y-8">
          {/* Headline */}
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              사라지는 생각들을<br />인사이트로 남기세요
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              편하게 말하면 블로그, 링크드인, 릴스, 쓰레드 콘텐츠로 변환해 드립니다
            </p>
          </div>

          {/* Visual: Voice -> 4 Platforms */}
          <div className="py-12">
            <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
              {/* Voice Icon */}
              <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-foreground">
                <div className="w-3 h-8 sm:w-4 sm:h-10 bg-background rounded-full" />
              </div>

              {/* Arrow */}
              <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />

              {/* Platform Icons */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blog/10 border-2 border-blog">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blog" />
                </div>
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linkedin/10 border-2 border-linkedin">
                  <Linkedin className="w-6 h-6 sm:w-7 sm:h-7 text-linkedin" />
                </div>
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-reels/10 border-2 border-reels">
                  <Video className="w-6 h-6 sm:w-7 sm:h-7 text-reels" />
                </div>
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-foreground/5 border-2 border-foreground">
                  <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div>
            <Button 
              size="lg" 
              onClick={() => navigate('/login')}
              className="bg-foreground text-background hover:bg-foreground/90 h-14 px-12 text-lg font-semibold"
            >
              지금 바로 시작하기
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
