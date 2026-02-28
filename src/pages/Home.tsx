import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mic, Loader2, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import { blobToBase64 } from "@/lib/guestPendingSubmission";
import { getEntrySource } from "@/lib/analytics";
import track from "@/lib/track";
import { getSessionId, getNextInputSeq } from "@/lib/session";
import { getAccessToken } from "@/lib/edgeFunctionAuth";

const guideChips = [
  {
    tag: "#소소한성취",
    placeholder: "오늘 해낸 작은 일, 스스로 칭찬하듯 정리해보세요.",
    mood: "proud",
    persona: "achiever",
    purpose: "record",
  },
  {
    tag: "#에러삽질기록",
    placeholder: "어떤 문제로 고생했나요? 해결 과정을 하소연하듯 정리해보세요.",
    mood: "chaotic",
    persona: "challenger",
    purpose: "review",
  },
  {
    tag: "#오늘의넋두리",
    placeholder: "그냥 털어놓고 싶은 이야기, 편하게 남겨보세요.",
    mood: "neutral",
    persona: "authentic",
    purpose: "emotion",
  },
  {
    tag: "#배운한가지",
    placeholder: "오늘 새로 알게 된 한 가지, 잊기 전에 정리해볼까요?",
    mood: "energetic",
    persona: "growth",
    purpose: "idea",
  },
];

interface HomeProps {
  isGuest?: boolean;
}

const Home = ({ isGuest = false }: HomeProps) => {
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Guide chip selection drives mood/persona/purpose silently
  const [selectedChipIndex, setSelectedChipIndex] = useState<number | null>(null);
  const [textPlaceholder, setTextPlaceholder] = useState("");

  // Hidden but populated from guide chip
  const [sessionPurpose, setSessionPurpose] = useState("record");
  const [selectedMood, setSelectedMood] = useState("neutral");
  const [selectedPersona, setSelectedPersona] = useState("authentic");
  const [keyword, setKeyword] = useState("");
  const [textInput, setTextInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    track.pageView("home");
  }, []);

  useEffect(() => {
    if (location.state?.initialText) {
      setInputMode("text");
      setTextInput(location.state.initialText);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleChipClick = (index: number) => {
    if (selectedChipIndex === index) {
      setSelectedChipIndex(null);
      setTextPlaceholder("");
      setSelectedMood("neutral");
      setSelectedPersona("authentic");
      setSessionPurpose("record");
      return;
    }
    const chip = guideChips[index];
    setSelectedChipIndex(index);
    setTextPlaceholder(chip.placeholder);
    setSelectedMood(chip.mood);
    setSelectedPersona(chip.persona);
    setSessionPurpose(chip.purpose);
  };

  // ── Recording logic (unchanged) ──
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
        setShowConfirmation(true);
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
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) startRecording();
    else stopRecording();
  };

  const handleRetry = () => {
    setShowConfirmation(false);
    setRecordedBlob(null);
    setIsRecording(false);
  };

  // ── Submit logic (completely preserved) ──
  const handleSubmit = async (mode: "voice" | "text") => {
    setIsSubmitting(true);

    const analyticsSessionId = getSessionId();
    const { seq, isFirst } = getNextInputSeq(analyticsSessionId);

    try {
      let audioBase64 = null;
      let finalTextInput = textInput;

      if (mode === "voice") {
        if (!recordedBlob) {
          toast({ title: "오류", description: "녹음 파일이 없습니다.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        audioBase64 = await blobToBase64(recordedBlob);
        finalTextInput = "";
      } else {
        if (!textInput.trim()) throw new Error("입력된 텍스트가 없습니다.");
      }

      if (user) {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          toast({ title: "로그인이 필요합니다", description: "다시 로그인해 주세요.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            session_purpose: sessionPurpose,
            selected_mood: selectedMood,
            selected_persona: selectedPersona,
            keyword: keyword,
            raw_text: finalTextInput,
            entry_source: getEntrySource(),
            input_type: mode,
          })
          .select("id")
          .single();

        if (sessionError) throw sessionError;

        track.submitInput(mode, {
          analytics_session_id: analyticsSessionId,
          db_session_id: sessionData.id,
          input_seq: seq,
          is_first_input: isFirst,
          selected_mood: selectedMood,
          selected_persona: selectedPersona,
          session_purpose: sessionPurpose,
        });

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

        void supabase.functions
          .invoke("process-audio", { body: formData, headers: { Authorization: `Bearer ${accessToken}` } })
          .then(({ error }) => {
            if (error) console.error("process-audio invoke error:", error);
          })
          .catch((e) => console.error("process-audio invoke failed:", e));

        supabase
          .from("users")
          .update({ usage_purpose: sessionPurpose || undefined })
          .eq("id", user.id)
          .then();

        navigate(`/result/${sessionData.id}?type=session`);
      } else {
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
            status: "processing",
            input_data: inputData,
          })
          .select("id")
          .single();

        if (draftError) throw draftError;

        localStorage.setItem("pending_draft_id", draftData.id);

        track.submitInput(mode, {
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
        fd.append("input_type", mode);
        fd.append("keyword", keyword || "");

        if (mode === "voice" && recordedBlob) {
          fd.append("audio", recordedBlob, "recording.webm");
        } else {
          fd.append("raw_text", finalTextInput);
        }

        fetch("https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio", {
          method: "POST",
          body: fd,
        }).catch(console.error);

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
    if (!textInput.trim()) {
      toast({ title: "입력 필요", description: "내용을 입력해주세요.", variant: "destructive" });
      return;
    }
    handleSubmit("text");
  };

  return (
    <AppShell isGuest={isGuest}>
      <div className="flex-1 flex flex-col px-5 md:px-6 pt-8 md:pt-12 pb-8 space-y-6 md:space-y-8">
        {/* ── 상단 카피 ── */}
        <div className="space-y-2 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
            당신의 넋두리를 성장의 기록으로.
          </h1>
          <p className="text-sm text-muted-foreground">
            30초만 말하세요. 당신의 경험이 문장이 됩니다.
          </p>
        </div>

        {/* ── 가이드 칩 ── */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">기록할 방향을 고르세요.</p>
          <div className="flex flex-wrap gap-2">
            {guideChips.map((chip, i) => (
              <button
                key={chip.tag}
                onClick={() => handleChipClick(i)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  selectedChipIndex === i
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/40"
                }`}
              >
                {chip.tag}
              </button>
            ))}
          </div>
        </div>

        {/* ── 음성 / 텍스트 토글 ── */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setInputMode("voice")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              inputMode === "voice"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> 음성
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              inputMode === "text"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Type className="w-3.5 h-3.5" /> 텍스트
          </button>
        </div>

        {/* ── 입력 영역 ── */}
        <div className="flex-1 flex flex-col justify-end">
          {inputMode === "voice" ? (
            <div className="flex flex-col items-center gap-4 pb-2">
              <button
                onClick={toggleRecording}
                className={`w-[6.5rem] h-[6.5rem] md:w-28 md:h-28 rounded-full bg-foreground flex items-center justify-center transition-all shadow-[0_6px_24px_rgba(0,0,0,0.15)] ${
                  isRecording
                    ? "animate-pulse scale-95"
                    : "hover:scale-105 active:scale-95"
                }`}
              >
                <Mic className="w-11 h-11 md:w-12 md:h-12 text-background" strokeWidth={2} />
              </button>
              <p className="text-sm font-medium text-foreground">
                {isRecording ? "녹음 중... 탭하여 중지" : "기록 시작하기"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={textPlaceholder || "자유롭게 적어주세요..."}
                className="min-h-[140px] md:min-h-[180px] rounded-xl border-border bg-background resize-none"
              />
              <Button
                onClick={handleTextSubmit}
                disabled={isSubmitting}
                className="w-full h-10 md:h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                {isSubmitting ? "저장 중..." : "기록 시작하기"}
              </Button>
            </div>
          )}
        </div>

        {/* ── 하단 유도 카피 ── */}
        <p className="text-center text-xs text-muted-foreground pb-2">
          완벽할 필요 없습니다. 오늘만 남겨보세요.
        </p>
      </div>

      {/* ── 녹음 확인 Sheet ── */}
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
              {isSubmitting ? "콘텐츠 생성하기" : "콘텐츠 생성하기"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── 제출 로딩 오버레이 ── */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 text-foreground animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-foreground">AI가 당신의 기록을 분석 중입니다...</p>
              <p className="text-sm text-muted-foreground">
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
