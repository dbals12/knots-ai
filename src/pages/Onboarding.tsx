import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const usagePurposes = [
  { value: "quick_summary", label: "빠르게 하루를 정리하고 싶어요" },
  { value: "career_branding", label: "커리어 브랜딩을 시작하고 싶어요" },
  { value: "performance_review", label: "업무 성과를 정리하는 게 어려워요" },
  { value: "record_habit", label: "기록은 하고 싶지만 시간이 없어요" },
  { value: "emotional_organize", label: "마음, 감정을 정리하고 싶어요" },
  { value: "content_ideas", label: "콘텐츠 아이디어가 필요해요" },
];

const jobRoles = [
  { value: "student", label: "학생" },
  { value: "job_seeker", label: "취준생" },
  { value: "pm", label: "기획자" },
  { value: "marketer", label: "마케터" },
  { value: "designer", label: "디자이너" },
  { value: "developer", label: "개발자" },
  { value: "data_analyst", label: "데이터 분석가" },
  { value: "hr", label: "HR" },
  { value: "sales", label: "세일즈" },
  { value: "ceo", label: "창업가" },
  { value: "creator", label: "크리에이터" },
  { value: "freelancer", label: "프리랜서" },
  { value: "professional", label: "전문직" },
  { value: "other", label: "기타" },
];

const personaOptions = [
  { value: "humble_expert", label: "겸손하지만 실력있는 전문가", desc: "차분하고 신뢰감을 주는 전문가 느낌" },
  { value: "energetic_challenger", label: "에너지 넘치는 도전가", desc: "추진력과 활기가 느껴지는 스타일" },
  { value: "deep_thinker", label: "깊이 있는 통찰력을 가진 사색가", desc: "성찰적이고 깊은 시선이 담긴 캐릭터" },
  { value: "friendly_peer", label: "친근하고 유쾌한 동료", desc: "다정하고 유머러스한 동료 느낌" },
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = async () => {
    if (!user || !selectedPurpose || !selectedRole || !selectedPersona) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          usage_purpose: selectedPurpose,
          job_role: selectedRole,
          preferred_tone: selectedPersona,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "설정 완료!",
        description: "이제 기록을 시작해볼까요?",
      });

      navigate("/input");
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[430px] space-y-8">
        {/* Progress bar */}
        <div className="flex gap-2">
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-foreground' : 'bg-border'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-foreground' : 'bg-border'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 3 ? 'bg-foreground' : 'bg-border'}`} />
        </div>

        {/* Step 1: Purpose */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground leading-tight">지금 어떤 도움이 필요하세요?</h2>
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
            <h2 className="text-2xl font-bold text-foreground leading-tight">어떤 일을 하고 계신가요?</h2>
            <div className="grid grid-cols-2 gap-3">
              {jobRoles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    selectedRole === role.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-white hover:border-foreground/30"
                  }`}
                >
                  <span className="text-[15px] font-medium">{role.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="w-full h-12 rounded-xl">
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

        {/* Step 3: Persona */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-foreground leading-tight">
                온라인에서 어떤 나로 보이고 싶으세요?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                채널별 톤앤매너는 AI가 자동으로 맞춰드립니다.
                <br />
                여기서는 모든 콘텐츠에 공통적으로 묻어날
                <br />
                '당신의 기본 캐릭터'를 선택해주세요.
              </p>
            </div>
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
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="w-full h-12 rounded-xl">
                이전
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!selectedPersona || loading}
                className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                {loading ? "저장 중..." : "시작하기"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
