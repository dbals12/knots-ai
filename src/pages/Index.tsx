import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, ChevronLeft, ChevronRight, Loader2, Settings, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";
import { trackSubmitInput, getEntrySource } from "@/lib/analytics";

const DRAFT_KEY = "temp_draft_input";
const AUTO_GENERATE_KEY = "auto_generate_after_login";

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

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Input state
  const [textInput, setTextInput] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [sessionPurpose, setSessionPurpose] = useState("");
  const [keyword, setKeyword] = useState("");

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Refs
  const moodScrollRef = useRef<HTMLDivElement>(null);
  const personaScrollRef = useRef<HTMLDivElement>(null);
  const purposeScrollRef = useRef<HTMLDivElement>(null);

  // Check user status and restore draft
  useEffect(() => {
    const checkStatus = async () => {
      // Restore draft if exists
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        setTextInput(savedDraft);
      }

      if (!user) {
        setIsCheckingStatus(false);
        return;
      }

      try {
        // Check if returning user
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        setIsReturningUser(sessions && sessions.length > 0);

        // Get user name
        const { data: userData } = await supabase
          .from("users")
          .select("email, job_role")
          .eq("id", user.id)
          .single();

        if (userData?.email) {
          const emailName = userData.email.split("@")[0];
          setUserName(emailName);
        }

        // Check if auto-generate after login
        const shouldAutoGenerate = localStorage.getItem(AUTO_GENERATE_KEY);
        if (shouldAutoGenerate && savedDraft) {
          localStorage.removeItem(AUTO_GENERATE_KEY);
          // Auto-trigger generation after a short delay
          setTimeout(() => {
            handleGenerate();
          }, 500);
        }
      } catch (error) {
        console.error("Error checking user status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkStatus();
  }, [user]);

  // Cleanup audio on unmount
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

  // Audio recording functions
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

  // Handle social login
  const handleSocialLogin = async (provider: "google" | "kakao") => {
    // Save draft before redirecting
    if (textInput.trim()) {
      localStorage.setItem(DRAFT_KEY, textInput);
      localStorage.setItem(AUTO_GENERATE_KEY, "true");
    }

    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
      setLoginLoading(false);
    }
  };

  // Main generate function
  const handleGenerate = async () => {
    const inputText = textInput.trim();

    if (!inputText && !recordedBlob) {
      toast({
        title: "입력이 필요해요",
        description: "내용을 입력하거나 녹음해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Guest flow: save draft and show login modal
    if (!user) {
      localStorage.setItem(DRAFT_KEY, inputText);
      setShowLoginModal(true);
      return;
    }

    // Member flow: process immediately
    setIsProcessing(true);

    try {
      // Use defaults for guests (now logged in) if options not selected
      const effectiveMood = selectedMood || "neutral";
      const effectivePersona = selectedPersona || "growth";
      const effectivePurpose = sessionPurpose || "record";

      const personaLabel = personas.find((p) => p.value === effectivePersona)?.label || effectivePersona;
      const moodLabel = moods.find((m) => m.value === effectiveMood)?.label || effectiveMood;
      const purposeLabel = sessionPurposes.find((p) => p.value === effectivePurpose)?.label || effectivePurpose;

      const formData = new FormData();
      
      if (recordedBlob) {
        formData.append("audio", recordedBlob, "recording.webm");
      } else {
        formData.append("raw_text", inputText);
      }
      
      formData.append("user_persona", personaLabel);
      formData.append("user_mood", moodLabel);
      formData.append("session_purpose", purposeLabel);

      const response = await fetch(`https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI processing failed");
      }

      const aiResult = await response.json();
      const { transcript, content } = aiResult;

      // Track analytics
      trackSubmitInput(recordedBlob ? "voice" : "text", transcript.length);

      // Save to database
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          raw_text: transcript,
          selected_mood: effectiveMood,
          selected_persona: effectivePersona,
          session_purpose: effectivePurpose,
          keyword: keyword || null,
          input_type: recordedBlob ? "voice" : "text",
          entry_source: getEntrySource(),
        })
        .select("id")
        .single();

      if (sessionError) throw new Error(sessionError.message);

      const sessionId = sessionData.id;

      const outputsToInsert = [
        { session_id: sessionId, platform_type: "blog", generated_content: content.blog_content },
        { session_id: sessionId, platform_type: "linkedin", generated_content: content.linkedin_content },
        { session_id: sessionId, platform_type: "reels", generated_content: content.reels_content },
        { session_id: sessionId, platform_type: "threads", generated_content: content.threads_content },
      ];

      const { error: outputsError } = await supabase.from("outputs").insert(outputsToInsert);
      if (outputsError) throw new Error(outputsError.message);

      // Clear draft
      localStorage.removeItem(DRAFT_KEY);
      
      navigate("/result");
    } catch (err) {
      console.error("Error in handleGenerate:", err);
      toast({
        title: "처리에 실패했습니다",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceSubmit = () => {
    setShowConfirmation(false);
    handleGenerate();
  };

  if (loading || isCheckingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  const isGuest = !user;
  const headline = isGuest
    ? "오늘 하루는 어땠나요?"
    : `${userName || "회원"}님, 오늘 하루는 어땠나요?`;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden min-h-[700px] flex flex-col">
        {/* Header */}
        <header className="relative flex items-center justify-center px-5 py-4 border-b border-border/50">
          {/* Center: Logo */}
          <button
            onClick={() => navigate("/")}
            className="text-xl font-normal tracking-wide text-foreground font-jost"
          >
            knots
          </button>

          {/* Right: Conditional buttons */}
          <div className="absolute right-5 flex items-center gap-2">
            {isGuest ? (
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-sm font-medium text-foreground hover:text-foreground/70 transition-colors"
              >
                로그인
              </button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/history")}
                  className="w-9 h-9 rounded-full hover:bg-muted"
                >
                  <FileText className="w-5 h-5 text-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/settings")}
                  className="w-9 h-9 rounded-full hover:bg-muted"
                >
                  <Settings className="w-5 h-5 text-foreground" />
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">
          {/* Headline */}
          <h2 className="text-2xl font-semibold text-foreground text-center">{headline}</h2>

          {/* Text Input */}
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="자유롭게 적거나 말해보세요."
            className="min-h-[140px] rounded-xl border-border bg-background resize-none text-base"
          />

          {/* Mic Button */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full bg-foreground flex items-center justify-center transition-all shadow-lg ${
                isRecording ? "animate-pulse scale-95" : "hover:scale-105"
              }`}
            >
              <Mic className="w-8 h-8 text-background" strokeWidth={2} />
            </button>
            <p className="text-xs text-muted-foreground">
              {isRecording ? "녹음 중... 다시 누르면 완료" : "또는 음성으로 녹음하기"}
            </p>
          </div>

          {/* Option Chips - Only for Members */}
          {!isGuest && (
            <>
              {/* Purpose Selector - Only for returning users */}
              {isReturningUser && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">오늘의 목적</h3>
                  <div className="relative group">
                    <button
                      onClick={() => scrollContainer(purposeScrollRef, "left")}
                      className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <div
                      ref={purposeScrollRef}
                      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
                    >
                      {sessionPurposes.map((purpose) => (
                        <button
                          key={purpose.value}
                          onClick={() => setSessionPurpose(sessionPurpose === purpose.value ? "" : purpose.value)}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-all whitespace-nowrap ${
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
                      className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Mood Selector */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">오늘 기분은?</h3>
                <div className="relative group">
                  <button
                    onClick={() => scrollContainer(moodScrollRef, "left")}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <div ref={moodScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {moods.map((mood) => (
                      <button
                        key={mood.value}
                        onClick={() => setSelectedMood(mood.value)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-all whitespace-nowrap ${
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
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Persona Selector */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">어떤 나로 정리할까요?</h3>
                <div className="relative group">
                  <button
                    onClick={() => scrollContainer(personaScrollRef, "left")}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <div ref={personaScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {personas.map((persona) => (
                      <button
                        key={persona.value}
                        onClick={() => setSelectedPersona(persona.value)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                          selectedPersona === persona.value
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-foreground hover:border-foreground/30"
                        }`}
                      >
                        <div className="font-medium whitespace-nowrap">{persona.label}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => scrollContainer(personaScrollRef, "right")}
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center bg-background border border-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Keyword Input */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">키워드 (선택)</label>
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 클라이언트 미팅, 런칭"
                  className="h-10 rounded-xl border-border bg-background text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* Generate Button */}
        <div className="px-6 pb-6">
          <Button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="w-full h-14 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                분석 중...
              </span>
            ) : (
              "콘텐츠 만들기"
            )}
          </Button>
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
                disabled={isProcessing}
                className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                제출하기
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Login Modal for Guests */}
        <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-semibold">
                작성하신 소중한 기록을<br />저장해 드릴게요
              </DialogTitle>
            </DialogHeader>
            <p className="text-center text-muted-foreground text-sm mb-4">
              3초 만에 결과 확인하기!
            </p>
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-gray-300 flex items-center justify-center gap-2"
                onClick={() => handleSocialLogin("google")}
                disabled={loginLoading}
              >
                <FcGoogle className="w-5 h-5" />
                Google로 계속하기
              </Button>

              <Button
                type="button"
                className="w-full h-12 text-black hover:bg-[#FEE500]/90 font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: "#FEE500" }}
                onClick={() => handleSocialLogin("kakao")}
                disabled={loginLoading}
              >
                <RiKakaoTalkFill className="w-5 h-5 text-black" />
                Kakao로 계속하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Full-screen Processing Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="w-12 h-12 text-foreground animate-spin" />
              <p className="text-lg font-medium text-foreground text-center">AI가 당신의 기록을 분석 중입니다...</p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                텍스트를 분석하고
                <br />
                4개 채널용 콘텐츠를 생성하는 중이에요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
