import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mic, ChevronLeft, ChevronRight, Loader2, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import { getEntrySource } from "@/lib/analytics";
import type { Json } from "@/integrations/supabase/types";

const sessionPurposes = [
  { value: "record", label: "기록" },
  { value: "career", label: "커리어 브랜딩" },
  { value: "review", label: "업무 회고" },
  { value: "emotion", label: "감정 정리" },
  { value: "idea", label: "아이디어 저장" },
];

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

const InputPage = () => {
  const [inputMode, setInputMode] = useState<"voice" | "text">("text");
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionPurpose, setSessionPurpose] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [keyword, setKeyword] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const moodScrollRef = useRef<HTMLDivElement>(null);
  const personaScrollRef = useRef<HTMLDivElement>(null);
  const purposeScrollRef = useRef<HTMLDivElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = ref.current.offsetWidth * 0.8;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(audioBlob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "마이크 접근 오류",
        description: "마이크 권한을 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
      setShowConfirmation(true);
    }
  };

  const toggleRecording = () => {
    if (!selectedMood || !selectedPersona) {
      toast({
        title: "선택이 필요해요",
        description: "오늘의 기분과 모드를 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handleRetry = () => {
    setShowConfirmation(false);
    setRecordedBlob(null);
    setIsRecording(false);
  };

  /**
   * Core submit handler - inserts into drafts table and navigates to /result/:draftId
   */
  const handleSubmit = async () => {
    // Validate
    if (!selectedMood || !selectedPersona) {
      toast({
        title: "선택이 필요해요",
        description: "오늘의 기분과 모드를 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const isVoiceMode = inputMode === "voice";

    if (isVoiceMode && !recordedBlob) {
      toast({
        title: "녹음이 필요해요",
        description: "녹음을 완료해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!isVoiceMode && !textInput.trim()) {
      toast({
        title: "입력이 필요해요",
        description: "내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setShowConfirmation(false);

    try {
      // Get labels for AI
      const personaLabel = personas.find((p) => p.value === selectedPersona)?.label || selectedPersona;
      const moodLabel = moods.find((m) => m.value === selectedMood)?.label || selectedMood;
      const purposeLabel = sessionPurposes.find((p) => p.value === sessionPurpose)?.label || "";

      // Build input_data for the draft
      const inputData = {
        raw_text: isVoiceMode ? "" : textInput.trim(),
        selected_mood: selectedMood,
        selected_persona: selectedPersona,
        keyword: keyword || null,
        input_type: isVoiceMode ? "voice" : "text",
        entry_source: getEntrySource(),
        session_purpose: sessionPurpose || null,
        // Labels for AI processing
        user_persona_label: personaLabel,
        user_mood_label: moodLabel,
        session_purpose_label: purposeLabel,
      };

      // Insert into drafts table (user_id is null for guests, or user.id if logged in)
      const { data: draftData, error: draftError } = await supabase
        .from("drafts")
        .insert({
          user_id: user?.id || null,
          status: "idle",
          input_data: inputData as unknown as Json,
        })
        .select("id")
        .single();

      if (draftError) {
        console.error("[InputPage] Draft insert error:", draftError);
        throw new Error(draftError.message);
      }

      const draftId = draftData.id;
      console.log("[InputPage] Draft created:", draftId);

      // Save draftId to localStorage for post-login redirect
      try {
        localStorage.setItem("pending_draft_id", draftId);
      } catch {}

      // Navigate to result page (works for both guest and logged-in)
      navigate(`/result/${draftId}`, { replace: true });
    } catch (err) {
      console.error("[InputPage] Submit error:", err);
      toast({
        title: "저장에 실패했습니다",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell className="min-h-[700px]" isGuest={!user}>
      {/* Main Content */}
      <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
        {/* Session Purpose Selector */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">오늘의 목적은 무엇인가요?</h2>
          <div className="relative group">
            <button
              onClick={() => scrollContainer(purposeScrollRef, "left")}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
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
                  onClick={() => setSessionPurpose(sessionPurpose === purpose.value ? "" : purpose.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all whitespace-nowrap snap-start ${
                    sessionPurpose === purpose.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/30"
                  }`}
                >
                  {purpose.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => scrollContainer(purposeScrollRef, "right")}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mood Selector */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">오늘 하루 어땠어요?</h2>
          <div className="relative group">
            <button
              onClick={() => scrollContainer(moodScrollRef, "left")}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div
              ref={moodScrollRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
            >
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(selectedMood === mood.value ? "" : mood.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all whitespace-nowrap snap-start ${
                    selectedMood === mood.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/30"
                  }`}
                >
                  {mood.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => scrollContainer(moodScrollRef, "right")}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Persona Selector */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">어떤 나로 기록할까요?</h2>
          <div className="relative group">
            <button
              onClick={() => scrollContainer(personaScrollRef, "left")}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div
              ref={personaScrollRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
            >
              {personas.map((persona) => (
                <button
                  key={persona.value}
                  onClick={() => setSelectedPersona(selectedPersona === persona.value ? "" : persona.value)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 text-left transition-all snap-start min-w-[140px] ${
                    selectedPersona === persona.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/30"
                  }`}
                >
                  <div className="text-sm font-medium">{persona.label}</div>
                  <div
                    className={`text-xs mt-1 ${
                      selectedPersona === persona.value ? "text-background/70" : "text-muted-foreground"
                    }`}
                  >
                    {persona.desc}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => scrollContainer(personaScrollRef, "right")}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Keyword Input */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">키워드가 있다면? (선택)</h2>
          <Input
            placeholder="예: 프로젝트 마감, 팀 미팅, 성과 발표"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-12"
          />
        </div>

        {/* Input Mode Toggle */}
        <div className="flex justify-center gap-2">
          <Button
            variant={inputMode === "voice" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMode("voice")}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            음성
          </Button>
          <Button
            variant={inputMode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMode("text")}
            className="gap-2"
          >
            <Type className="w-4 h-4" />
            텍스트
          </Button>
        </div>

        {/* Voice Input */}
        {inputMode === "voice" && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <button
              onClick={toggleRecording}
              disabled={isSubmitting}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
            <p className="text-sm text-muted-foreground">
              {isRecording ? "녹음 중... 탭하여 중지" : "탭하여 녹음 시작"}
            </p>
          </div>
        )}

        {/* Text Input */}
        {inputMode === "text" && (
          <div className="space-y-4">
            <Textarea
              placeholder="오늘 있었던 일을 자유롭게 적어주세요..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="min-h-[200px] resize-none"
            />
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !textInput.trim()}
              className="w-full h-12"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                "콘텐츠 생성하기"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Voice Confirmation Sheet */}
      <Sheet open={showConfirmation} onOpenChange={setShowConfirmation}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>녹음을 완료할까요?</SheetTitle>
          </SheetHeader>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={handleRetry} className="flex-1">
              다시 녹음
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                "콘텐츠 생성하기"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default InputPage;
