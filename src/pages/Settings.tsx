import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/AppShell';


const usagePurposes = [
  { value: "quick_summary", label: "빠르게 하루를 정리하고 싶어요" },
  { value: "career_branding", label: "커리어 브랜딩을 시작하고 싶어요" },
  { value: "performance_review", label: "업무 성과를 정리하는 게 어려워요" },
  { value: "record_habit", label: "기록은 하고 싶지만 시간이 없어요" },
  { value: "emotional_organize", label: "마음, 감정을 정리하고 싶어요" },
  { value: "content_ideas", label: "콘텐츠 아이디어가 필요해요" },
];

const jobRoleOptions = [
  { value: "student", label: "학생 / 취준생" },
  { value: "office_planning", label: "직장인 (기획·마케팅)" },
  { value: "office_dev", label: "직장인 (개발·데이터)" },
  { value: "designer_creator", label: "디자이너 / 크리에이터" },
  { value: "freelancer", label: "프리랜서" },
  { value: "entrepreneur", label: "창업가 / 1인 비즈니스" },
  { value: "other", label: "기타" },
];

const personaOptions = [
  { value: "humble_expert", label: "겸손하지만 실력있는 전문가", desc: "차분하고 신뢰감을 주는 전문가 느낌" },
  { value: "energetic_challenger", label: "에너지 넘치는 도전가", desc: "추진력과 활기가 느껴지는 스타일" },
  { value: "deep_thinker", label: "깊이 있는 통찰력을 가진 사색가", desc: "성찰적이고 깊은 시선이 담긴 캐릭터" },
  { value: "friendly_peer", label: "친근하고 유쾌한 동료", desc: "다정하고 유머러스한 동료 느낌" },
];

const Settings = () => {
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [selectedJobRole, setSelectedJobRole] = useState("");
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
        .select('usage_purpose, preferred_tone, job_role')
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
        setSelectedJobRole(data.job_role || '');
        setSelectedPersona(data.preferred_tone || '');
      }

      setInitialLoading(false);
    };

    fetchUserProfile();
  }, [user, toast]);

  const handleSave = async () => {
    if (!user || !selectedPurpose || !selectedJobRole || !selectedPersona) {
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
          job_role: selectedJobRole,
          preferred_tone: selectedPersona,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: '저장 완료',
        description: '프로필이 저장되었습니다.',
      });

      navigate('/');
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
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 pb-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">프로필 설정</h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            이 서비스가 기억해야 할 기본 설정을 수정할 수 있습니다.
          </p>
        </div>

        {/* Section 1: Usage Purpose */}
        <div className="space-y-2 md:space-y-3">
          <h3 className="text-sm font-semibold text-foreground">서비스 이용 목적</h3>
          <div className="space-y-1.5 md:space-y-2">
            {usagePurposes.map((purpose) => (
              <button
                key={purpose.value}
                onClick={() => setSelectedPurpose(purpose.value)}
                className={`w-full p-2.5 md:p-3 rounded-xl border-2 text-left transition-all text-sm ${
                  selectedPurpose === purpose.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-secondary hover:border-foreground/30"
                }`}
              >
                {purpose.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Job Role */}
        <div className="space-y-2 md:space-y-3">
          <h3 className="text-sm font-semibold text-foreground">직업 선택</h3>
          <div className="space-y-1.5 md:space-y-2">
            {jobRoleOptions.map((job) => (
              <button
                key={job.value}
                onClick={() => setSelectedJobRole(job.value)}
                className={`w-full p-2.5 md:p-3 rounded-xl border-2 text-left transition-all text-sm ${
                  selectedJobRole === job.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-secondary hover:border-foreground/30"
                }`}
              >
                {job.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Preferred Tone */}
        <div className="space-y-2 md:space-y-3">
          <h3 className="text-sm font-semibold text-foreground">선호하는 페르소나</h3>
          <div className="space-y-1.5 md:space-y-2">
            {personaOptions.map((persona) => (
              <button
                key={persona.value}
                onClick={() => setSelectedPersona(persona.value)}
                className={`w-full p-2.5 md:p-3 rounded-xl border-2 text-left transition-all ${
                  selectedPersona === persona.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-secondary hover:border-foreground/30"
                }`}
              >
                <div className="font-semibold text-sm">{persona.label}</div>
                <div
                  className={`text-xs mt-0.5 ${
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
          disabled={!selectedPurpose || !selectedJobRole || !selectedPersona || loading}
          className="w-full h-10 md:h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90"
        >
          {loading ? '저장 중...' : '저장하기'}
        </Button>
      </div>
    </AppShell>
  );
};

export default Settings;
