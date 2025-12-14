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
import { trackSubmitInput, getEntrySource } from "@/lib/analytics";

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

const Home = () => {
  // Input mode: 'voice' or 'text'
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
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Check if user has previous sessions
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsLoadingUserStatus(false);
        return;
      }

      try {
        const { data: sessions, error } = await supabase.from("sessions").select("id").eq("user_id", user.id).limit(1);

        if (error) throw error;

        const hasPreviousSession = sessions && sessions.length > 0;
        setIsReturningUser(hasPreviousSession);

        if (!hasPreviousSession) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("usage_purpose")
            .eq("id", user.id)
            .single();

          if (userError) throw userError;

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
        }
      } catch (error) {
        console.error("Error checking user status:", error);
      } finally {
        setIsLoadingUserStatus(false);
      }
    };

    checkUserStatus();
  }, [user]);

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
        console.log("Recording stopped. Blob size:", audioBlob.size);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log("Recording started");
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
      console.log("Recording stopped");
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

  // Voice submit handler
  const handleVoiceSubmit = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        variant: "destructive",
      });
      return;
    }

    if (!recordedBlob) {
      toast({
        title: "녹음된 오디오가 없습니다",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmation(false);
    setIsProcessing(true);

    try {
      const personaLabel = personas.find((p) => p.value === selectedPersona)?.label || selectedPersona;
      const moodLabel = moods.find((m) => m.value === selectedMood)?.label || selectedMood;
      const purposeLabel = sessionPurposes.find((p) => p.value === sessionPurpose)?.label || sessionPurpose;

      console.log("Calling process-audio edge function...");

      const formData = new FormData();
      formData.append("audio", recordedBlob, "recording.webm");
      formData.append("user_persona", personaLabel);
      formData.append("user_mood", moodLabel);
      formData.append("session_purpose", purposeLabel || "");

      const response = await fetch(`https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI processing failed");
      }

      const aiResult = await response.json();
      console.log("AI processing completed:", aiResult);

      const { transcript, content } = aiResult;

      console.log("Inserting session into database...");

      // Dual-track: Fire analytics event in parallel with DB insert
      const analyticsPromise = Promise.resolve().then(() => {
        trackSubmitInput("voice", transcript.length);
      });

      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          raw_text: transcript,
          selected_mood: selectedMood,
          selected_persona: selectedPersona,
          session_purpose: isReturningUser ? sessionPurpose || null : null,
          keyword: keyword || null,
          input_type: "voice",
          entry_source: getEntrySource(),
        })
        .select("id")
        .single();

      if (sessionError) {
        console.error("Session insert error:", sessionError);
        throw new Error(sessionError.message);
      }

      const sessionId = sessionData.id;
      console.log("Session created with ID:", sessionId);

      console.log("Inserting outputs into database...");
      const outputsToInsert = [
        { session_id: sessionId, platform_type: "blog", generated_content: content.blog_content },
        { session_id: sessionId, platform_type: "linkedin", generated_content: content.linkedin_content },
        { session_id: sessionId, platform_type: "reels", generated_content: content.reels_content },
        { session_id: sessionId, platform_type: "threads", generated_content: content.threads_content },
      ];

      const { error: outputsError } = await supabase.from("outputs").insert(outputsToInsert);

      if (outputsError) {
        console.error("Outputs insert error:", outputsError);
        throw new Error(outputsError.message);
      }

      // Wait for analytics (non-blocking)
      await analyticsPromise.catch(console.error);

      console.log("All data saved successfully. Navigating to result...");
      navigate("/result");
    } catch (err) {
      console.error("Error in handleVoiceSubmit:", err);
      toast({
        title: "AI 처리 또는 저장에 실패했습니다",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Text submit handler
  const handleTextSubmit = async () => {
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
      const personaLabel = personas.find((p) => p.value === selectedPersona)?.label || selectedPersona;
      const moodLabel = moods.find((m) => m.value === selectedMood)?.label || selectedMood;
      const purposeLabel = sessionPurposes.find((p) => p.value === sessionPurpose)?.label || sessionPurpose;

      console.log("Calling process-audio edge function with text input...");

      const formData = new FormData();
      formData.append("raw_text", textInput.trim());
      formData.append("user_persona", personaLabel);
      formData.append("user_mood", moodLabel);
      formData.append("session_purpose", purposeLabel || "");

      const response = await fetch(`https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI processing failed");
      }

      const aiResult = await response.json();
      console.log("AI processing completed:", aiResult);

      const { transcript, content } = aiResult;

      console.log("Inserting session into database...");

      // Dual-track: Fire analytics event in parallel with DB insert
      const analyticsPromise = Promise.resolve().then(() => {
        trackSubmitInput("text", transcript.length);
      });

      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          raw_text: transcript,
          selected_mood: selectedMood,
          selected_persona: selectedPersona,
          session_purpose: isReturningUser ? sessionPurpose || null : null,
          keyword: keyword || null,
          input_type: "text",
          entry_source: getEntrySource(),
        })
        .select("id")
        .single();

      if (sessionError) {
        console.error("Session insert error:", sessionError);
        throw new Error(sessionError.message);
      }

      const sessionId = sessionData.id;
      console.log("Session created with ID:", sessionId);

      console.log("Inserting outputs into database...");
      const outputsToInsert = [
        { session_id: sessionId, platform_type: "blog", generated_content: content.blog_content },
        { session_id: sessionId, platform_type: "linkedin", generated_content: content.linkedin_content },
        { session_id: sessionId, platform_type: "reels", generated_content: content.reels_content },
        { session_id: sessionId, platform_type: "threads", generated_content: content.threads_content },
      ];

      const { error: outputsError } = await supabase.from("outputs").insert(outputsToInsert);

      if (outputsError) {
        console.error("Outputs insert error:", outputsError);
        throw new Error(outputsError.message);
      }

      // Wait for analytics (non-blocking)
      await analyticsPromise.catch(console.error);

      console.log("All data saved successfully. Navigating to result...");
      navigate("/result");
    } catch (err) {
      console.error("Error in handleTextSubmit:", err);
      toast({
        title: "AI 처리 또는 저장에 실패했습니다",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell className="min-h-[700px]">
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

        {/* Mood Selector - Always Visible */}
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

        {/* Persona Selector - Always Visible */}
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
            <Mic className="w-4 h-4" />
            음성
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              inputMode === "text"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Type className="w-4 h-4" />
            텍스트
          </button>
        </div>

        {/* Conditional Input Area */}
        {inputMode === "voice" ? (
          /* Voice Recording Area */
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
          /* Text Input Area */
          <div className="space-y-4">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="오늘 있었던 일이나 배운 점을 자유롭게 작성해주세요..."
              className="min-h-[200px] rounded-xl border-border bg-background resize-none"
            />
            <Button
              onClick={handleTextSubmit}
              disabled={isProcessing}
              className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              {isProcessing ? "처리 중..." : "완료"}
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

      {/* Full-screen Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 text-foreground animate-spin" />
            <p className="text-lg font-medium text-foreground text-center">AI가 당신의 기록을 분석 중입니다...</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {inputMode === "voice"
                ? "음성을 텍스트로 변환하고 4개 채널용 콘텐츠를 생성하는 중이에요."
                : "텍스트를 분석하고 4개 채널용 콘텐츠를 생성하는 중이에요."}
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Home;
