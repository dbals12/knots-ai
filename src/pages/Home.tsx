import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';
import Header from '@/components/Header';

const sessionPurposes = [
  { value: 'record', label: '기록' },
  { value: 'career', label: '커리어 브랜딩' },
  { value: 'review', label: '업무 회고' },
  { value: 'emotion', label: '감정 정리' },
  { value: 'idea', label: '아이디어 저장' },
];

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionPurpose, setSessionPurpose] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isLoadingUserStatus, setIsLoadingUserStatus] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const moodScrollRef = useRef<HTMLDivElement>(null);
  const personaScrollRef = useRef<HTMLDivElement>(null);
  const purposeScrollRef = useRef<HTMLDivElement>(null);

  // Check if user has previous sessions
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsLoadingUserStatus(false);
        return;
      }

      try {
        // Check if user has any previous sessions
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) throw error;

        const hasPreviousSession = sessions && sessions.length > 0;
        setIsReturningUser(hasPreviousSession);

        // If first-time user (no previous sessions), auto-initialize session_purpose
        if (!hasPreviousSession) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('usage_purpose')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;

          if (userData?.usage_purpose) {
            // Map usage_purpose to session_purpose format
            const purposeMap: Record<string, string> = {
              '빠르게 하루를 정리하고 싶어요': 'record',
              '커리어 브랜딩을 시작하고 싶어요': 'career',
              '업무 성과를 정리하는 게 어려워요': 'review',
              '마음·감정을 정리하고 싶어요': 'emotion',
              '콘텐츠 아이디어가 필요해요': 'idea',
            };
            setSessionPurpose(purposeMap[userData.usage_purpose] || '');
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      } finally {
        setIsLoadingUserStatus(false);
      }
    };

    checkUserStatus();
  }, [user]);

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
      setShowConfirmation(true);
    }
  };

  const handleRetry = () => {
    setShowConfirmation(false);
    setIsRecording(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: '로그인이 필요합니다',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Insert session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          raw_text: '', // Will be filled during recording - placeholder for now
          selected_mood: selectedMood,
          selected_persona: selectedPersona,
          session_purpose: isReturningUser ? (sessionPurpose || null) : null,
          keyword: keyword || null,
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Session insert error:', sessionError);
        toast({
          title: '저장에 실패했습니다',
          description: sessionError.message,
          variant: 'destructive',
        });
        return;
      }

      const sessionId = sessionData.id;

      // Step 2: Insert 4 outputs (one for each platform)
      const platforms = ['blog', 'linkedin', 'reels', 'threads'];
      const outputsToInsert = platforms.map(platform => ({
        session_id: sessionId,
        platform_type: platform,
        generated_content: `[${platform.toUpperCase()}] 콘텐츠가 생성될 예정입니다.`, // Placeholder content
      }));

      const { error: outputsError } = await supabase
        .from('outputs')
        .insert(outputsToInsert);

      if (outputsError) {
        console.error('Outputs insert error:', outputsError);
        toast({
          title: '결과 저장에 실패했습니다',
          description: outputsError.message,
          variant: 'destructive',
        });
        return;
      }

      setShowConfirmation(false);
      navigate('/result');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: '저장에 실패했습니다',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 space-y-8">
        <div className="w-full max-w-[430px] mx-auto space-y-8">
          
          {/* Session Purpose Selector - Only for returning users */}
          {!isLoadingUserStatus && isReturningUser && (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                오늘의 목적은 무엇인가요?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                오늘은 이 기록을 어떤 용도로 남기고 싶은지 선택해 주세요. (선택 사항)
              </p>
            </div>
            <div className="relative group">
              <button
                onClick={() => scrollContainer(purposeScrollRef, 'left')}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-white border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div 
                ref={purposeScrollRef}
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
              >
                {sessionPurposes.map((purpose) => (
                  <button
                    key={purpose.value}
                    onClick={() => setSessionPurpose(sessionPurpose === purpose.value ? '' : purpose.value)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all whitespace-nowrap snap-start ${
                      sessionPurpose === purpose.value
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-white text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {purpose.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => scrollContainer(purposeScrollRef, 'right')}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-white border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          )}

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

      {/* Confirmation Sheet */}
      <Sheet open={showConfirmation} onOpenChange={setShowConfirmation}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl font-bold text-center">
              녹음을 마쳤어요. 어떻게 할까요?
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 pb-6">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full h-12 rounded-xl border-border"
            >
              다시 녹음하기
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              {isSubmitting ? '저장 중...' : '제출하기'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Home;
