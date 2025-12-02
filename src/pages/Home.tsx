import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';

const moods = [
  { value: 'energetic', label: '🔥 불타는 하루', icon: null },
  { value: 'tired', label: '😞 좀 힘들고 지쳤다', icon: null },
  { value: 'proud', label: '😊 뿌듯했다', icon: null },
  { value: 'neutral', label: '😐 그냥 그런 날', icon: null },
  { value: 'chaotic', label: '🤯 정신 없었다', icon: null },
];

const personas = [
  { value: 'growth', label: '🌱 성장한 나', desc: '배운 점, 성장 포인트 중심', icon: null },
  { value: 'achiever', label: '💼 일잘러 나', desc: '성과, 문제 해결, 인사이트 중심', icon: null },
  { value: 'collaborator', label: '🤝 협업한 나', desc: '사람, 팀워크, 관계 중심', icon: null },
  { value: 'challenger', label: '⚡ 갈등한 나', desc: '어려움, 스트레스, 고민을 솔직히', icon: null },
  { value: 'authentic', label: '💬 날것의 나', desc: '포장 없이 있는 그대로', icon: null },
];

const platformPreviews = [
  { value: 'blog', label: '블로그 (회고)', icon: SiNaver, color: '#03C75A' },
  { value: 'linkedin', label: 'LinkedIn', icon: SiLinkedin, color: '#0077B5' },
  { value: 'reels', label: 'Reels 대본', icon: SiInstagram, color: 'gradient' },
  { value: 'threads', label: 'Threads', icon: SiThreads, color: '#000000' },
];

const Home = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const moodScrollRef = useRef<HTMLDivElement>(null);
  const personaScrollRef = useRef<HTMLDivElement>(null);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.offsetWidth * 0.8;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleRecording = () => {
    if (!selectedMood || !selectedPersona) {
      toast({
        title: '선택이 필요해요',
        description: '오늘의 기분과 모드를 먼저 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!isRecording) {
      setIsRecording(true);
    } else {
      setIsRecording(false);
      navigate('/result');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Switch Manager</h1>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-1" />
          로그아웃
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 space-y-8">
        <div className="w-full max-w-[430px] mx-auto space-y-8">
          
          {/* Mood Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              오늘 하루는 어땠나요?
            </h2>
            <div className="relative group">
              <button
                onClick={() => scrollContainer(moodScrollRef, 'left')}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-white border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div 
                ref={moodScrollRef}
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
              >
                {moods.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                    className={`flex-shrink-0 px-5 py-3 rounded-xl border-2 transition-all whitespace-nowrap snap-start ${
                      selectedMood === mood.value
                        ? 'border-foreground bg-white shadow-sm'
                        : 'border-border bg-white hover:border-foreground/30'
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{mood.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => scrollContainer(moodScrollRef, 'right')}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-white border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Persona Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              오늘은 어떤 나로 정리할까요?
            </h2>
            <div className="relative group">
              <button
                onClick={() => scrollContainer(personaScrollRef, 'left')}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-white border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div 
                ref={personaScrollRef}
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
              >
                {personas.map((persona) => (
                  <button
                    key={persona.value}
                    onClick={() => setSelectedPersona(persona.value)}
                    className={`flex-shrink-0 px-5 py-3 rounded-xl border-2 transition-all snap-start ${
                      selectedPersona === persona.value
                        ? 'border-foreground bg-white shadow-sm'
                        : 'border-border bg-white hover:border-foreground/30'
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground whitespace-nowrap">
                      {persona.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                      {persona.desc}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => scrollContainer(personaScrollRef, 'right')}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-white border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Keyword Input */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">
              오늘의 키워드 (한두 단어로 정리해볼까요?)
            </label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 클라이언트 미팅, 런칭, 실수"
              className="h-11 rounded-xl border-border bg-white"
            />
          </div>

          {/* Recording Area */}
          <div className="flex flex-col items-center space-y-6 py-8">
            <button
              onClick={toggleRecording}
              className={`w-32 h-32 rounded-full bg-foreground flex items-center justify-center transition-all shadow-2xl ${
                isRecording ? 'animate-pulse scale-95' : 'hover:scale-105'
              }`}
            >
              <Mic className="w-14 h-14 text-background" strokeWidth={2.5} />
            </button>
            <p className="text-sm text-muted-foreground text-center">
              {isRecording ? '녹음 중...' : '버튼을 누르고 자유롭게 이야기해주세요.'}
            </p>
          </div>

          {/* Optional Text Input Link */}
          <div className="text-center">
            <Link to="/input-text" className="text-sm text-muted-foreground hover:text-foreground underline">
              텍스트로 입력할래요
            </Link>
          </div>

          {/* Platform Preview */}
          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-4">
              이렇게 변환됩니다
            </p>
            <div className="grid grid-cols-4 gap-3">
              {platformPreviews.map((platform) => (
                <div key={platform.value} className="flex flex-col items-center gap-2">
                  {platform.color === 'gradient' ? (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center">
                      <platform.icon className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: platform.color }}>
                      <platform.icon className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-center text-muted-foreground">{platform.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Home;
