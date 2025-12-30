import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mic, ChevronLeft, ChevronRight, Loader2, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import { blobToBase64 } from "@/lib/guestPendingSubmission"; // base64 변환용 유틸만 사용
import { getEntrySource } from "@/lib/analytics";

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

  // 입력 상태들
  const [sessionPurpose, setSessionPurpose] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [keyword, setKeyword] = useState("");
  const [textInput, setTextInput] = useState("");

  // 상태 관리
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isLoadingUserStatus, setIsLoadingUserStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // 저장 중 로딩

  // 오디오 관련 Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // 스크롤 Refs
  const moodScrollRef = useRef<HTMLDivElement>(null);
  const personaScrollRef = useRef<HTMLDivElement>(null);
  const purposeScrollRef = useRef<HTMLDivElement>(null);

  // ✅ [중요] 기존 유저 설정 불러오기 (UI 커스텀용)
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsLoadingUserStatus(false);
        return;
      }

      try {
        // sessions 테이블 확인은 '기록 모아보기' 버튼 노출 여부 등을 위해 유지 (선택사항)
        const { data: sessions, error } = await supabase.from("sessions").select("id").eq("user_id", user.id).limit(1);
        if (!error) {
          setIsReturningUser(sessions && sessions.length > 0);
        }

        // 유저 선호 설정 불러오기
        const { data: userData } = await supabase.from("users").select("usage_purpose").eq("id", user.id).single();

        if (userData?.usage_purpose) {
          const purposeMap: Record<string, string> = {
            "빠르게 하루를 정리하고 싶어요": "record",
            "커리어 브랜딩을 시작하고 싶어요": "career",
            "업무 성과를 정리하는 게 어려워요": "review",
            "마음·감정을 정리하고 싶어요": "emotion",
            "콘텐츠 아이디어가 필요해요": "idea",
          };
          setSessionPurpose(purposeMap[userData.usage_purpose] || "");
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
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // --- 녹음 관련 로직 (기존 유지) ---
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
      toast({ title: "선택이 필요해요", description: "기분과 모드를 먼저 선택해주세요.", variant: "destructive" });
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

  // --- ✅ 핵심 로직: Draft 생성 및 리다이렉트 (공통) ---
  const createDraftAndRedirect = async (mode: "voice" | "text") => {
    setIsSubmitting(true);
    try {
      // 1. 입력 데이터 준비 (JSONB에 넣을 객체)
      const inputData: any = {
        inputMode: mode,
        selectedMood,
        selectedPersona,
        sessionPurpose,
        keyword,
        entrySource: getEntrySource(),
      };

      // 2. 텍스트 vs 음성 데이터 처리
      if (mode === "voice") {
        if (!recordedBlob) throw new Error("No audio recorded");
        // 오디오를 Base64로 변환하여 저장 (MVP용)
        const audioBase64 = await blobToBase64(recordedBlob);
        inputData.audioBase64 = audioBase64;
      } else {
        if (!textInput.trim()) throw new Error("No text input");
        inputData.textInput = textInput;
      }

      // 3. Drafts 테이블에 INSERT (sessions가 아님!)
      // user_id는 로그인 상태면 넣고, 아니면 null (Guest)
      const { data, error } = await supabase
        .from("drafts")
        .insert({
          user_id: user?.id || null, // Guest 허용
          status: "idle", // 아직 AI 안 돌림 -> Result 페이지가 돌릴 것임
          input_data: inputData,
        })
        .select("id")
        .single();

      if (error) throw error;

      // 4. 안전장치: LocalStorage에 ID 저장 (로그인 튕김 방지용)
      localStorage.setItem("pending_draft_id", data.id);

      // 5. Result 페이지로 납치 (여기서 AI 로딩 시작)
      console.log("Draft created:", data.id, "Redirecting to result...");
      navigate(`/result/${data.id}`);
    } catch (error: any) {
      console.error("Draft creation failed:", error);
      toast({
        title: "저장 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // 핸들러 연결
  const handleVoiceSubmit = () => createDraftAndRedirect("voice");
  const handleTextSubmit = () => {
    if (!selectedMood || !selectedPersona) {
      toast({ title: "선택이 필요해요", description: "기분과 모드를 선택해주세요.", variant: "destructive" });
      return;
    }
    if (!textInput.trim()) {
      toast({ title: "입력이 필요해요", description: "내용을 입력해주세요.", variant: "destructive" });
      return;
    }
    createDraftAndRedirect("text");
  };

  return (
    <AppShell className="min-h-[700px]" isGuest={isGuest}>
      {/* Main Content */}
      <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
        {/* Session Purpose Selector - Only for returning users */}
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
        )}

        {/* Mood Selector */}
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
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap snap-start ${
                    selectedMood === mood.value
                      ? "border-foreground bg-background shadow-sm"
                      : "border-border bg-background hover:border-foreground/30"
                  }`}
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

        {/* Persona Selector */}
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
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all snap-start ${
                    selectedPersona === persona.value
                      ? "border-foreground bg-background shadow-sm"
                      : "border-border bg-background hover:border-foreground/30"
                  }`}
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

        {/* Keyword Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">오늘의 키워드 (한두 단어로 정리해볼까요?)</label>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 클라이언트 미팅, 런칭, 실수"
            className="h-11 rounded-xl border-border bg-background"
          />
        </div>

        {/* Input Mode Toggle */}
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            onClick={() => setInputMode("voice")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              inputMode === "voice"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Mic className="w-4 h-4" /> 음성
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              inputMode === "text"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Type className="w-4 h-4" /> 텍스트
          </button>
        </div>

        {/* Conditional Input Area */}
        {inputMode === "voice" ? (
          <div className="flex flex-col items-center space-y-4 py-6">
            <button
              onClick={toggleRecording}
              className={`w-28 h-28 rounded-full bg-foreground flex items-center justify-center transition-all shadow-xl ${
                isRecording ? "animate-pulse scale-95" : "hover:scale-105"
              }`}
            >
              <Mic className="w-12 h-12 text-background" strokeWidth={2.5} />
            </button>
            <p className="text-sm text-muted-foreground text-center">
              {isRecording ? "녹음 중..." : "버튼을 누르고 자유롭게 이야기해주세요"}
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

      {/* Voice Confirmation Sheet */}
      <Sheet open={showConfirmation} onOpenChange={setShowConfirmation}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl font-bold text-center">녹음을 마쳤어요. 어떻게 할까요?</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 pb-6">
            <Button onClick={handleRetry} variant="outline" className="w-full h-12 rounded-xl border-border">
              다시 녹음하기
            </Button>
            <Button
              onClick={handleVoiceSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              {isSubmitting ? "저장 중..." : "제출하기"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Full-screen Loading Overlay (Submission) */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-foreground animate-spin" />
          <p className="mt-4 text-lg font-medium text-foreground">기록을 저장하고 있어요...</p>
        </div>
      )}
    </AppShell>
  );
};

export default Home;
