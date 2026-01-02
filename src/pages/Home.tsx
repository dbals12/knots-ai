import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mic, ChevronLeft, ChevronRight, Loader2, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import { blobToBase64 } from "@/lib/guestPendingSubmission";
import { getEntrySource } from "@/lib/analytics";

// 선택지 데이터 (기존 유지)
const sessionPurposes = [
  { value: "record", label: "기록" },
  { value: "career", label: "커리어 브랜딩" },
  { value: "review", label: "업무 회고" },
  { value: "emotion", label: "감정 정리" },
  { value: "idea", label: "아이디어 저장" },
];

const moods = [
  { value: "energetic", label: "🔥 불타는 하루", icon: null },
  { value: "tired", label: "😞 좀 힘들고 지쳤다", icon: null },
  { value: "proud", label: "😊 뿌듯했다", icon: null },
  { value: "neutral", label: "😐 그냥 그런 날", icon: null },
  { value: "chaotic", label: "🤯 정신 없었다", icon: null },
];

const personas = [
  { value: "growth", label: "🌱 성장한 나", desc: "배운 점, 성장 포인트 중심", icon: null },
  { value: "achiever", label: "💼 일잘러 나", desc: "성과, 문제 해결, 인사이트 중심", icon: null },
  { value: "collaborator", label: "🤝 협업한 나", desc: "사람, 팀워크, 관계 중심", icon: null },
  { value: "challenger", label: "⚡ 갈등한 나", desc: "어려움, 스트레스, 고민을 솔직히", icon: null },
  { value: "authentic", label: "💬 날것의 나", desc: "포장 없이 있는 그대로", icon: null },
];

interface HomeProps {
  isGuest?: boolean;
}

const Home = ({ isGuest = false }: HomeProps) => {
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [sessionPurpose, setSessionPurpose] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [keyword, setKeyword] = useState("");
  const [textInput, setTextInput] = useState("");

  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isLoadingUserStatus, setIsLoadingUserStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const moodScrollRef = useRef<HTMLDivElement>(null);
  const personaScrollRef = useRef<HTMLDivElement>(null);
  const purposeScrollRef = useRef<HTMLDivElement>(null);

  // 수정하기로 돌아왔을 때 데이터 복구
  useEffect(() => {
    if (location.state?.initialText) {
      setInputMode("text");
      setTextInput(location.state.initialText);
      // 상태 초기화
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // 유저 상태 체크
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsLoadingUserStatus(false);
        return;
      }
      try {
        const { count } = await supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        setIsReturningUser((count || 0) > 0);

        // 기존 설정 불러오기 (온보딩 효과)
        const { data: userData } = await supabase.from("users").select("usage_purpose").eq("id", user.id).single();
        if (userData?.usage_purpose) {
          const purposeMap: Record<string, string> = {
            "빠르게 하루를 정리하고 싶어요": "record",
            "커리어 브랜딩을 시작하고 싶어요": "career",
            "업무 성과를 정리하는 게 어려워요": "review",
            "마음·감정을 정리하고 싶어요": "emotion",
            "콘텐츠 아이디어가 필요해요": "idea",
          };
          // 이미 선택된 값이 없으면 기본값으로 설정
          if (!sessionPurpose) setSessionPurpose(purposeMap[userData.usage_purpose] || "");
        }
      } catch (error) {
        console.error("Error checking user status:", error);
      } finally {
        setIsLoadingUserStatus(false);
      }
    };
    checkUserStatus();
  }, [user]);

  // 마이크 스트림 정리
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
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(audioBlob);
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({ title: "마이크 오류", description: "마이크 권한을 확인해주세요.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setShowConfirmation(true);
    }
  };

  const toggleRecording = () => {
    if (!selectedMood || !selectedPersona) {
      toast({ title: "선택 필요", description: "기분과 모드를 먼저 선택해주세요.", variant: "destructive" });
      return;
    }
    if (!isRecording) startRecording();
    else stopRecording();
  };

  const handleRetry = () => {
    setShowConfirmation(false);
    setRecordedBlob(null);
    setIsRecording(false);
  };

  // ✅ [핵심] 제출 로직 분기 (회원 vs 비회원)
  const handleSubmit = async (mode: "voice" | "text") => {
    setIsSubmitting(true);
    try {
      let audioBase64 = null;
      let finalTextInput = textInput;

      if (mode === "voice") {
        if (!recordedBlob) throw new Error("No audio recorded");
        audioBase64 = await blobToBase64(recordedBlob);
      } else {
        if (!textInput.trim()) throw new Error("No text input");
      }

      // 1. 로그인 유저 -> sessions 테이블 저장 (정석)
      if (user) {
        // (1) 세션 생성
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            session_purpose: sessionPurpose,
            selected_mood: selectedMood,
            selected_persona: selectedPersona,
            keyword: keyword,
            raw_text: mode === "text" ? finalTextInput : "",
            entry_source: getEntrySource(),
            input_type: mode,
          })
          .select("id")
          .single();

        if (sessionError) throw sessionError;

        // (2) Edge Function 호출 (AI 생성)
        const formData = new FormData();
        formData.append("session_id", sessionData.id);
        formData.append("user_persona", selectedPersona);
        formData.append("user_mood", selectedMood);
        formData.append("session_purpose", sessionPurpose);
        if (mode === "voice" && recordedBlob) {
          formData.append("audio", recordedBlob, "recording.webm");
        } else {
          formData.append("raw_text", finalTextInput);
        }

        const response = await fetch("https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("AI Processing Failed");

        // (3) 결과창 이동 (session 타입 명시)
        navigate(`/result/${sessionData.id}?type=session`);

        // (4) 유저 취향 업데이트 (온보딩 효과)
        supabase
          .from("users")
          .update({ usage_purpose: sessionPurpose || undefined })
          .eq("id", user.id)
          .then();
      }
      // 2. 게스트 -> drafts 테이블 저장 (간편)
      else {
        const inputData = {
          inputMode: mode,
          selectedMood,
          selectedPersona,
          sessionPurpose,
          keyword,
          audioBase64,
          textInput: finalTextInput,
        };

        const { data: draftData, error: draftError } = await supabase
          .from("drafts")
          .insert({
            status: "idle", // DraftResult에서 AI 호출
            input_data: inputData,
          })
          .select("id")
          .single();

        if (draftError) throw draftError;

        localStorage.setItem("pending_draft_id", draftData.id);
        navigate(`/result/${draftData.id}?type=draft`);
      }
    } catch (error: any) {
      console.error("Submission failed:", error);
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const handleVoiceSubmit = () => handleSubmit("voice");
  const handleTextSubmit = () => {
    if (!selectedMood || !selectedPersona) {
      toast({ title: "선택 필요", description: "기분과 모드를 선택해주세요.", variant: "destructive" });
      return;
    }
    if (!textInput.trim()) {
      toast({ title: "입력 필요", description: "내용을 입력해주세요.", variant: "destructive" });
      return;
    }
    handleSubmit("text");
  };

  return (
    <AppShell className="min-h-[700px]" isGuest={isGuest}>
      <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
        {!isLoadingUserStatus && isReturningUser && (
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
                    className={`flex-shrink-0 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all whitespace-nowrap snap-start ${sessionPurpose === purpose.value ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground/30"}`}
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
        )}

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">오늘 하루는 어땠나요?</h2>
          <div className="relative group">
            <button
              onClick={() => scrollContainer(moodScrollRef, "left")}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div ref={moodScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap snap-start ${selectedMood === mood.value ? "border-foreground bg-background shadow-sm" : "border-border bg-background hover:border-foreground/30"}`}
                >
                  <span className="text-sm font-medium text-foreground">{mood.label}</span>
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

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">오늘은 어떤 나로 정리할까요?</h2>
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
                  onClick={() => setSelectedPersona(persona.value)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all snap-start ${selectedPersona === persona.value ? "border-foreground bg-background shadow-sm" : "border-border bg-background hover:border-foreground/30"}`}
                >
                  <div className="text-sm font-medium text-foreground whitespace-nowrap">{persona.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{persona.desc}</div>
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

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">오늘의 키워드 (한두 단어로 정리해볼까요?)</label>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 클라이언트 미팅, 런칭, 실수"
            className="h-11 rounded-xl border-border bg-background"
          />
        </div>

        <div className="flex items-center justify-center gap-2 py-2">
          <button
            onClick={() => setInputMode("voice")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${inputMode === "voice" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <Mic className="w-4 h-4" /> 음성
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${inputMode === "text" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <Type className="w-4 h-4" /> 텍스트
          </button>
        </div>

        {inputMode === "voice" ? (
          <div className="flex flex-col items-center space-y-4 py-6">
            <button
              onClick={toggleRecording}
              className={`w-28 h-28 rounded-full bg-foreground flex items-center justify-center transition-all shadow-xl ${isRecording ? "animate-pulse scale-95" : "hover:scale-105"}`}
            >
              <Mic className="w-12 h-12 text-background" strokeWidth={2.5} />
            </button>
            <p className="text-sm text-muted-foreground text-center">
              {isRecording ? "녹음 중... 탭하여 중지" : "버튼을 누르고 자유롭게 이야기해주세요"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="오늘 있었던 일이나 배운 점을 자유롭게 작성해주세요..."
              className="min-h-[200px] rounded-xl border-border bg-background resize-none"
            />
            <Button
              onClick={handleTextSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              {isSubmitting ? "저장 중..." : "완료"}
            </Button>
          </div>
        )}
      </div>

      <Sheet open={showConfirmation} onOpenChange={setShowConfirmation}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl font-bold text-center">녹음을 완료할까요?</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 pb-6">
            <Button onClick={handleRetry} variant="outline" className="w-full h-12 rounded-xl border-border">
              다시 녹음
            </Button>
            <Button
              onClick={handleVoiceSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              {isSubmitting ? "저장 중..." : "콘텐츠 생성하기"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {isSubmitting && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 text-foreground animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-foreground text-black">AI가 당신의 기록을 분석 중입니다...</p>
              <p className="text-sm text-muted-foreground text-gray-500">
                {inputMode === "voice" ? "음성을 텍스트로 변환하고" : "텍스트를 분석하고"}
                <br />
                4개 채널용 콘텐츠를 생성하는 중이에요.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Home;
