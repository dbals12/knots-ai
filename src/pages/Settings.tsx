import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const usagePurposes = [
  { value: "quick_summary", label: "빠르게 하루를 정리하고 싶어요" },
  { value: "career_branding", label: "커리어 브랜딩을 시작하고 싶어요" },
  { value: "performance_review", label: "업무 성과를 정리하는 게 어려워요" },
  { value: "record_habit", label: "기록은 하고 싶지만 시간이 없어요" },
  { value: "emotional_organize", label: "마음, 감정을 정리하고 싶어요" },
  { value: "content_ideas", label: "콘텐츠 아이디어가 필요해요" },
];

const personaOptions = [
  { value: "humble_expert", label: "겸손하지만 실력있는 전문가", desc: "차분하고 신뢰감을 주는 전문가 느낌" },
  { value: "energetic_challenger", label: "에너지 넘치는 도전가", desc: "추진력과 활기가 느껴지는 스타일" },
  { value: "deep_thinker", label: "깊이 있는 통찰력을 가진 사색가", desc: "성찰적이고 깊은 시선이 담긴 캐릭터" },
  { value: "friendly_peer", label: "친근하고 유쾌한 동료", desc: "다정하고 유머러스한 동료 느낌" },
];

const Settings = () => {
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('usage_purpose, preferred_tone')
        .eq('id', user.id)
        .single();

      if (error) {
        toast({
          title: '오류',
          description: '프로필을 불러올 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        setSelectedPurpose(data.usage_purpose || '');
        setSelectedPersona(data.preferred_tone || '');
      }

      setInitialLoading(false);
    };

    fetchUserProfile();
  }, [user, toast]);

  const handleSave = async () => {
    if (!user || !selectedPurpose || !selectedPersona) {
      toast({
        title: '필수 항목',
        description: '모든 항목을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          usage_purpose: selectedPurpose,
          preferred_tone: selectedPersona,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: '저장 완료',
        description: '프로필이 저장되었습니다.',
      });

      navigate('/input');
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 py-5 flex items-center border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/input')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          돌아가기
        </Button>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="w-full max-w-[430px] mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">프로필 설정</h1>
            <p className="text-sm text-muted-foreground mt-2">
              이 서비스가 기억해야 할 기본 설정을 수정할 수 있습니다.
            </p>
          </div>

          {/* Section 1: Usage Purpose */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              서비스 이용 목적
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {usagePurposes.map((purpose) => (
                <button
                  key={purpose.value}
                  onClick={() => setSelectedPurpose(purpose.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPurpose === purpose.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-white hover:border-foreground/30"
                  }`}
                >
                  <span className="text-[15px] font-medium">{purpose.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Preferred Tone */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              선호하는 페르소나
            </h2>
            <div className="space-y-3">
              {personaOptions.map((persona) => (
                <button
                  key={persona.value}
                  onClick={() => setSelectedPersona(persona.value)}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    selectedPersona === persona.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-white hover:border-foreground/30"
                  }`}
                >
                  <div className="font-bold text-base mb-2">{persona.label}</div>
                  <div
                    className={`text-sm ${
                      selectedPersona === persona.value ? "text-background/70" : "text-muted-foreground"
                    }`}
                  >
                    {persona.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!selectedPurpose || !selectedPersona || loading}
            className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            {loading ? '저장 중...' : '저장하기'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
