import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const usagePurposes = [
  { value: 'quick_summary', label: '빠르게 하루를 정리하고 싶어요' },
  { value: 'career_branding', label: '커리어 브랜딩을 시작하고 싶어요' },
  { value: 'performance_review', label: '업무 성과를 정리하는 게 어려워요' },
  { value: 'record_habit', label: '기록은 하고 싶지만 시간이 없어요' },
  { value: 'emotional_organize', label: '마음·감정을 정리하고 싶어요' },
  { value: 'content_ideas', label: '콘텐츠 아이디어가 필요해요' },
];

const jobRoles = [
  { value: 'student', label: '학생' },
  { value: 'job_seeker', label: '취준생' },
  { value: 'pm', label: '기획자' },
  { value: 'marketer', label: '마케터' },
  { value: 'designer', label: '디자이너' },
  { value: 'developer', label: '개발자' },
  { value: 'data_analyst', label: '데이터 분석가' },
  { value: 'hr', label: 'HR' },
  { value: 'sales', label: '세일즈' },
  { value: 'ceo', label: '창업가' },
  { value: 'creator', label: '크리에이터' },
  { value: 'freelancer', label: '프리랜서' },
  { value: 'professional', label: '전문직' },
  { value: 'other', label: '기타' },
];

const tonePreferences = [
  { value: 'logical', label: '논리적이고 차분하게', desc: 'Professional & Structured' },
  { value: 'witty', label: '솔직하고 위트있게', desc: 'Witty & Cynical' },
  { value: 'emotional', label: '감성적이고 따뜻하게', desc: 'Emotional & Warm' },
  { value: 'concise', label: '간결하고 임팩트있게', desc: 'Concise & Impactful' },
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTone, setSelectedTone] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = async () => {
    if (!user || !selectedPurpose || !selectedRole || !selectedTone) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          usage_purpose: selectedPurpose,
          job_role: selectedRole,
          preferred_tone: selectedTone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: '설정 완료!',
        description: '이제 기록을 시작해볼까요?',
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[430px] space-y-8">
        
        {/* Progress indicator */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {step} / 3
          </p>
        </div>

        {/* Step 1: Purpose */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground leading-tight">
              지금 어떤 도움이<br />필요하세요?
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {usagePurposes.map((purpose) => (
                <button
                  key={purpose.value}
                  onClick={() => setSelectedPurpose(purpose.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPurpose === purpose.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-white hover:border-foreground/30'
                  }`}
                >
                  <span className="text-[15px] font-medium">{purpose.label}</span>
                </button>
              ))}
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedPurpose}
              className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              다음
            </Button>
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground leading-tight">
              어떤 일을<br />하고 계신가요?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {jobRoles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    selectedRole === role.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-white hover:border-foreground/30'
                  }`}
                >
                  <span className="text-[15px] font-medium">{role.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full h-12 rounded-xl"
              >
                이전
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedRole}
                className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                다음
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Tone */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground leading-tight mb-2">
                평소 선호하는<br />글 스타일은?
              </h2>
              <p className="text-sm text-muted-foreground">
                AI가 어떤 톤으로 초안을 잡아주길 원하시나요?
              </p>
            </div>
            <div className="space-y-3">
              {tonePreferences.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedTone === tone.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-white hover:border-foreground/30'
                  }`}
                >
                  <div className="font-medium text-[15px]">{tone.label}</div>
                  <div className={`text-sm mt-1 ${
                    selectedTone === tone.value ? 'text-background/70' : 'text-muted-foreground'
                  }`}>
                    {tone.desc}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="w-full h-12 rounded-xl"
              >
                이전
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!selectedTone || loading}
                className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                {loading ? '저장 중...' : '시작하기'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
