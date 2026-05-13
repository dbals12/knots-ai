import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mic, ChevronLeft, ChevronRight, Loader2, Type, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import { blobToBase64 } from "@/lib/guestPendingSubmission";
import { getEntrySource } from "@/lib/analytics";
import type { Json } from "@/integrations/supabase/types";
import { getAccessToken } from "@/lib/edgeFunctionAuth";
import track from "@/lib/track";
import { getSessionId, getNextInputSeq } from "@/lib/session";

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
      ref.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeOptions = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const selectedMime = mimeOptions.find(m => MediaRecorder.isTypeSupported(m)) || '';
      console.log('[Recording] Selected mimeType:', selectedMime || 'browser default');

      const recorderOptions: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || selectedMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        console.log('[Recording] Blob created - size:', audioBlob.size, 'type:', audioBlob.type, 'chunks:', audioChunksRef.current.length);

        if (audioChunksRef.current.length === 0 || audioBlob.size < 5000) {
          toast({ title: "녹음 실패", description: "녹음이 너무 짧거나 실패했습니다. 다시 시도해주세요.", variant: "destructive" });
          setRecordedBlob(null);
          return;
        }
        setRecordedBlob(audioBlob);
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      toast({ title: "오류", description: "마이크 권한을 확인해주세요.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setShowConfirmation(true);
    }
  };

  const toggleRecording = () => {
    if (!selectedMood || !selectedPersona) {
      toast({ title: "선택 필요", description: "기분과 모드를 먼저 선택해주세요.", variant: "destructive" });
      return;
    }
    isRecording ? stopRecording() : startRecording();
  };

  const handleRetry = () => {
    setShowConfirmation(false);
    setRecordedBlob(null);
    setIsRecording(false);
  };

  // 🔥 속도 개선 + submit_input 트래킹 (draft 생성 후 발송)
  const handleSubmit = async () => {
    if (!selectedMood || !selectedPersona) {
      toast({ title: "선택 필요", description: "기분과 모드를 선택해주세요.", variant: "destructive" });
      return;
    }

    const isVoiceMode = inputMode === "voice";
    if (isVoiceMode && !recordedBlob) {
      toast({ title: "녹음 필요", description: "녹음이 완료되지 않았습니다.", variant: "destructive" });
      return;
    }
    if (!isVoiceMode && !textInput.trim()) {
      toast({ title: "입력 필요", description: "내용을 입력해주세요.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setShowConfirmation(false);

    const analyticsSessionId = getSessionId();
    const { seq, isFirst } = getNextInputSeq(analyticsSessionId);

    try {
      let audioBase64 = null;
      if (isVoiceMode && recordedBlob) {
        try {
          audioBase64 = await blobToBase64(recordedBlob);
        } catch (e) {}
      }

      // [로그인 유저 로직]
      if (user) {
        // 1. 세션 DB에 저장 (ID 확보)
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            session_purpose: sessionPurpose,
            selected_mood: selectedMood,
            selected_persona: selectedPersona,
            keyword: keyword,
            raw_text: isVoiceMode ? "" : textInput.trim(),
            input_type: inputMode,
            entry_source: getEntrySource(),
          })
          .select("id")
          .single();

        if (sessionError) throw sessionError;

        // ✅ submit_input: db_session_id 포함하여 즉시 발송
        track.submitInput(inputMode, {
          analytics_session_id: analyticsSessionId,
          db_session_id: sessionData.id,
          input_seq: seq,
          is_first_input: isFirst,
          selected_mood: selectedMood,
          selected_persona: selectedPersona,
          session_purpose: sessionPurpose,
        });

        // 2. AI 요청 (Fire & Forget)
        const formData = new FormData();
        formData.append("session_id", sessionData.id);
        formData.append("user_persona", selectedPersona);
        formData.append("user_mood", selectedMood);
        formData.append("session_purpose", sessionPurpose);

        if (isVoiceMode && recordedBlob) {
          formData.append("audio", recordedBlob, "recording.webm");
        } else {
          formData.append("raw_text", textInput.trim());
        }

        fetch("https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio", {
          method: "POST",
          body: formData,
        }).catch((err) => console.error("AI Trigger Failed", err));

        // 3. 즉시 결과 페이지로 이동
        navigate(`/result/${sessionData.id}?type=session`);
      } else {
        // [게스트 로직] - draft 먼저 생성 → submit_input 이벤트 → Edge Function 호출
        const inputData = {
          inputMode,
          selectedMood,
          selectedPersona,
          sessionPurpose,
          keyword,
          textInput: isVoiceMode ? "" : textInput.trim(),
          audioBase64,
        };

        // ✅ draft 먼저 생성 (submit_input에 draft_id 포함 필수)
        const { data: draftData, error: draftError } = await supabase
          .from("drafts")
          .insert({ status: "processing", input_data: inputData as unknown as Json })
          .select("id")
          .single();

        if (draftError) throw draftError;
        localStorage.setItem("pending_draft_id", draftData.id);

        // ✅ submit_input: draft_id 포함하여 즉시 발송 (첫 번째부터 기록됨)
        track.submitInput(inputMode, {
          analytics_session_id: analyticsSessionId,
          db_session_id: null,
          draft_id: draftData.id,
          input_seq: seq,
          is_first_input: isFirst,
          selected_mood: selectedMood,
          selected_persona: selectedPersona,
          session_purpose: sessionPurpose,
        });

        const fd = new FormData();
        fd.append("draft_id", draftData.id);
        fd.append("user_persona", selectedPersona);
        fd.append("user_mood", selectedMood);
        fd.append("session_purpose", sessionPurpose);
        fd.append("input_type", inputMode);
        fd.append("keyword", keyword || "");

        if (isVoiceMode && recordedBlob) {
          fd.append("audio", recordedBlob, "recording.webm");
        } else {
          fd.append("raw_text", textInput.trim());
        }

        fetch("https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio", {
          method: "POST",
          body: fd,
        }).catch(console.error);

        navigate(`/result/${draftData.id}?type=draft`);
      }
    } catch (err: any) {
      console.error("Submit Error:", err);
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell className="flex flex-col" isGuest={!user}>
      {/* 헤더: 뒤로가기 버튼 */}
      <div className="px-4 py-3 bg-background border-b border-border flex items-center gap-2 sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="p-1.5 hover:bg-muted rounded-full">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <span className="font-semibold text-base text-foreground">기록하기</span>
      </div>

      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 overflow-y-auto pb-8">
        {/* 목적 선택 */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">오늘의 목적은 무엇인가요?</h2>
          <div className="relative group">
            <button
              onClick={() => scrollContainer(purposeScrollRef, "left")}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm"
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
                  className={`flex-shrink-0 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all whitespace-nowrap snap-start ${sessionPurpose === purpose.value ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground"}`}
                >
                  {purpose.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => scrollContainer(purposeScrollRef, "right")}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 기분 선택 */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">오늘 하루 어땠나요?</h2>
          <div className="relative group">
            <div ref={moodScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(selectedMood === mood.value ? "" : mood.value)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap snap-start ${selectedMood === mood.value ? "border-foreground bg-background shadow-sm" : "border-border bg-background"}`}
                >
                  <span className="text-sm font-medium text-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 페르소나 선택 */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">어떤 나로 기록할까요?</h2>
          <div className="relative group">
            <div
              ref={personaScrollRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
            >
              {personas.map((persona) => (
                <button
                  key={persona.value}
                  onClick={() => setSelectedPersona(selectedPersona === persona.value ? "" : persona.value)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 text-left transition-all snap-start min-w-[140px] ${selectedPersona === persona.value ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}
                >
                  <div className="text-sm font-medium">{persona.label}</div>
                  <div
                    className={`text-xs mt-1 ${selectedPersona === persona.value ? "text-background/70" : "text-muted-foreground"}`}
                  >
                    {persona.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 키워드 */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">키워드 (선택)</h2>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 미팅, 실수, 성취"
            className="h-12 rounded-xl"
          />
        </div>

        {/* 입력 모드 */}
        <div className="flex justify-center gap-2 pt-2">
          <Button
            variant={inputMode === "voice" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMode("voice")}
            className="gap-2 rounded-full"
          >
            <Mic className="w-4 h-4" /> 음성
          </Button>
          <Button
            variant={inputMode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMode("text")}
            className="gap-2 rounded-full"
          >
            <Type className="w-4 h-4" /> 텍스트
          </Button>
        </div>

        {/* 텍스트 입력 */}
        {inputMode === "text" && (
          <div className="space-y-4">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="자유롭게 적어주세요..."
              className="min-h-[200px] resize-none rounded-xl text-base"
            />
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !textInput.trim()}
              className="w-full h-14 rounded-xl text-lg font-bold"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "콘텐츠 생성하기"}
            </Button>
          </div>
        )}

        {/* 음성 입력 */}
        {inputMode === "voice" && (
          <div className="flex flex-col items-center space-y-3 py-4 md:py-6">
            <button
              onClick={toggleRecording}
              className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording ? "bg-destructive animate-pulse text-destructive-foreground" : "bg-foreground text-background hover:scale-105"}`}
            >
              <Mic className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            <p className="text-xs md:text-sm text-muted-foreground">{isRecording ? "녹음 중... (터치해서 중지)" : "터치해서 녹음 시작"}</p>
          </div>
        )}
      </div>

      {/* 맨 하단 고정 버튼 */}
      <div className="shrink-0 px-4 pb-4 pt-2 bg-background border-t border-border/30">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (inputMode === "text" ? !textInput.trim() : !recordedBlob)}
          className="w-full h-14 rounded-xl text-lg font-bold"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : "기록 시작하기"}
        </Button>
      </div>

      <Sheet open={showConfirmation} onOpenChange={setShowConfirmation}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>녹음 완료</SheetTitle>
          </SheetHeader>
          <div className="flex gap-3 mt-6 pb-6">
            <Button variant="outline" onClick={handleRetry} className="flex-1 h-12 rounded-xl">
              다시 녹음
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 h-12 rounded-xl font-bold">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "생성하기"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default InputPage;
