import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";

const moods = [
  { value: "energetic", label: "🔥 불타는 하루" },
  { value: "tired", label: "😞 좀 힘들고 지쳤다" },
  { value: "proud", label: "😊 뿌듯했다" },
  { value: "neutral", label: "😐 그냥 그런 날" },
  { value: "chaotic", label: "🤯 정신 없었다" },
];

const personas = [
  { value: "growth", label: "🌱 성장한 나", desc: "배운 점, 성장 포인트 중심" },
  { value: "achiever", label: "💼 일잘러 나", desc: "성과, 문제 해결, 인사이트 중심" },
  { value: "collaborator", label: "🤝 협업한 나", desc: "사람, 팀워크, 관계 중심" },
  { value: "challenger", label: "⚡ 갈등한 나", desc: "어려움, 스트레스, 고민을 솔직히" },
  { value: "authentic", label: "💬 날것의 나", desc: "포장 없이 있는 그대로" },
];

const sessionPurposes = [
  { value: 'record', label: '기록' },
  { value: 'career', label: '커리어 브랜딩' },
  { value: 'review', label: '업무 회고' },
  { value: 'emotion', label: '감정 정리' },
  { value: 'idea', label: '아이디어 저장' },
];

const InputText = () => {
  const [searchParams] = useSearchParams();
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [sessionPurpose, setSessionPurpose] = useState("");
  const [keyword, setKeyword] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Read URL params on mount
  useEffect(() => {
    const moodParam = searchParams.get('mood');
    const personaParam = searchParams.get('persona');
    const purposeParam = searchParams.get('purpose');
    
    if (moodParam) setSelectedMood(moodParam);
    if (personaParam) setSelectedPersona(personaParam);
    if (purposeParam) setSessionPurpose(purposeParam);
  }, [searchParams]);

  // Get labels for display
  const getMoodLabel = () => moods.find(m => m.value === selectedMood)?.label;
  const getPersonaLabel = () => personas.find(p => p.value === selectedPersona)?.label;

  const handleComplete = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!selectedMood || !selectedPersona) {
      toast({
        title: "선택이 필요해요",
        description: "오늘의 기분과 모드를 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!textInput.trim()) {
      toast({
        title: "입력이 필요해요",
        description: "내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get labels for AI processing
      const personaLabel = personas.find(p => p.value === selectedPersona)?.label || selectedPersona;
      const moodLabel = moods.find(m => m.value === selectedMood)?.label || selectedMood;
      const purposeLabel = sessionPurposes.find(p => p.value === sessionPurpose)?.label || sessionPurpose;

      // Call process-audio with raw_text (text-only mode)
      console.log('Calling process-audio edge function with text input...');
      
      const formData = new FormData();
      formData.append('raw_text', textInput.trim());
      formData.append('user_persona', personaLabel);
      formData.append('user_mood', moodLabel);
      formData.append('session_purpose', purposeLabel || '');

      const response = await fetch(
        `https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI processing failed');
      }

      const aiResult = await response.json();
      console.log('AI processing completed:', aiResult);

      const { transcript, content } = aiResult;

      // Insert session into database
      console.log('Inserting session into database...');
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          raw_text: transcript,
          selected_mood: selectedMood,
          selected_persona: selectedPersona,
          session_purpose: sessionPurpose || null,
          keyword: keyword || null,
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Session insert error:', sessionError);
        throw new Error(sessionError.message);
      }

      const sessionId = sessionData.id;
      console.log('Session created with ID:', sessionId);

      // Insert 4 outputs
      console.log('Inserting outputs into database...');
      const outputsToInsert = [
        { session_id: sessionId, platform_type: 'blog', generated_content: content.blog_content },
        { session_id: sessionId, platform_type: 'linkedin', generated_content: content.linkedin_content },
        { session_id: sessionId, platform_type: 'reels', generated_content: content.reels_content },
        { session_id: sessionId, platform_type: 'threads', generated_content: content.threads_content },
      ];

      const { error: outputsError } = await supabase
        .from('outputs')
        .insert(outputsToInsert);

      if (outputsError) {
        console.error('Outputs insert error:', outputsError);
        throw new Error(outputsError.message);
      }

      console.log('All data saved successfully. Navigating to result...');
      navigate('/result');

    } catch (err) {
      console.error('Error in handleComplete:', err);
      toast({
        title: 'AI 처리 또는 저장에 실패했습니다',
        description: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 text-foreground animate-spin" />
            <p className="text-lg font-medium text-foreground text-center">
              AI가 당신의 기록을 분석 중입니다...
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              텍스트를 분석하고, 4개 채널용 콘텐츠를 생성하는 중이에요.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 space-y-8">
        <div className="w-full max-w-[430px] mx-auto space-y-8">
          
          {/* Context Summary - Show if params passed */}
          {(selectedMood || selectedPersona) && (
            <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">선택한 설정:</span>
              {getMoodLabel() && (
                <span className="text-sm font-medium text-foreground bg-background px-3 py-1 rounded-full border border-border">
                  {getMoodLabel()}
                </span>
              )}
              {getPersonaLabel() && (
                <span className="text-sm font-medium text-foreground bg-background px-3 py-1 rounded-full border border-border">
                  {getPersonaLabel()}
                </span>
              )}
            </div>
          )}

          {/* Mood Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">오늘 하루는 어땠나요?</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl border-2 transition-all whitespace-nowrap ${
                    selectedMood === mood.value
                      ? "border-foreground bg-white shadow-sm"
                      : "border-border bg-white hover:border-foreground/30"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Persona Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">오늘은 어떤 나로 정리할까요?</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {personas.map((persona) => (
                <button
                  key={persona.value}
                  onClick={() => setSelectedPersona(persona.value)}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl border-2 transition-all ${
                    selectedPersona === persona.value
                      ? "border-foreground bg-white shadow-sm"
                      : "border-border bg-white hover:border-foreground/30"
                  }`}
                >
                  <div className="text-sm font-medium text-foreground whitespace-nowrap">{persona.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{persona.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Keyword Input */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">오늘의 키워드 (한 두 단어로 정리해볼까요?)</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 클라이언트 미팅, 런칭, 실수"
              className="h-11 rounded-xl border-border bg-white"
            />
          </div>

          {/* Text Input Area */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">오늘 있었던 일이나 배운 점을 자유롭게 작성해주세요.</label>
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="여기에 입력하세요..."
              className="min-h-[300px] rounded-xl border-border bg-white"
            />
          </div>

          {/* Complete Button */}
          <Button
            onClick={handleComplete}
            disabled={isProcessing}
            className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            {isProcessing ? '처리 중...' : '완료'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default InputText;
