import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import GlassOrb from "@/components/GlassOrb";
import { blobToBase64 } from "@/lib/guestPendingSubmission";
import { getEntrySource } from "@/lib/analytics";
import track from "@/lib/track";
import { getSessionId, getNextInputSeq } from "@/lib/session";
import { getAccessToken } from "@/lib/edgeFunctionAuth";

const guideChips = [
  {
    tag: "오늘의 넋두리",
    label: "감정",
    emoji: "💭",
    placeholder: "오늘 있었던 일 중\n그냥 털어놓고 싶은 이야기가 있나요?",
    mood: "neutral",
    persona: "authentic",
    purpose: "emotion",
  },
  {
    tag: "배운 점",
    label: "학습",
    emoji: "💡",
    placeholder: "오늘 새롭게 깨달은 점이나\n배운 것이 있나요?",
    mood: "energetic",
    persona: "growth",
    purpose: "idea",
  },
  {
    tag: "성취 기록",
    label: "성과",
    emoji: "🏆",
    placeholder: "오늘 해낸 작은 일이나\n스스로 칭찬하고 싶은 순간이 있나요?",
    mood: "proud",
    persona: "achiever",
    purpose: "record",
  },
  {
    tag: "문제 해결",
    label: "삽질",
    emoji: "🔧",
    placeholder: "오늘 어떤 문제로 고생했나요?\n해결 과정을 남겨보세요.",
    mood: "chaotic",
    persona: "challenger",
    purpose: "review",
  },
  {
    tag: "생각 정리",
    label: "인지",
    emoji: "🧠",
    placeholder: "지금 머릿속에 맴도는 생각이 있나요?\n정리되지 않아도 괜찮아요.",
    mood: "neutral",
    persona: "authentic",
    purpose: "emotion",
  },
];

const defaultPlaceholder =
  "오늘 하루를 기록해보세요.\n기록 방향을 고르면\nAI가 정리 방법을 알려드려요.";

interface HomeProps {
  isGuest?: boolean;
}

const Home = ({ isGuest = false }: HomeProps) => {
  const [inputMode, setInputMode] = useState<"voice" | "text" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [selectedChipIndex, setSelectedChipIndex] = useState<number | null>(null);
  const [cardPlaceholder, setCardPlaceholder] = useState(defaultPlaceholder);

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

  const orbState = isRecording ? "recording" : inputMode === "text" ? "text" : "idle";

  const handleChipClick = (index: number) => {
    if (selectedChipIndex === index) {
      setSelectedChipIndex(null);
      setCardPlaceholder(defaultPlaceholder);
      setSelectedMood("neutral");
      setSelectedPersona("authentic");
      setSessionPurpose("record");
      return;
    }
    const chip = guideChips[index];
    setSelectedChipIndex(index);
    setCardPlaceholder(chip.placeholder);
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
      const recorderOptions: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || selectedMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
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
          .then(({ error }) => { if (error) console.error("process-audio invoke error:", error); })
          .catch((e) => console.error("process-audio invoke failed:", e));
        supabase.from("users").update({ usage_purpose: sessionPurpose || undefined }).eq("id", user.id).then();
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
          .insert({ status: "processing", input_data: inputData })
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

  const handleVoiceClick = () => {
    if (inputMode === "voice" && isRecording) {
      stopRecording();
    } else {
      setInputMode("voice");
      startRecording();
    }
  };

  return (
    <AppShell isGuest={isGuest}>
      <div className="flex-1 flex flex-col px-5 md:px-6 pt-2 pb-5 overflow-y-auto">
        {/* ── Glass Orb ── */}
        <div className="flex justify-center pt-4 pb-3">
          <GlassOrb state={orbState} size="w-[45vw] h-[45vw] max-w-[200px] max-h-[200px]" />
        </div>

        {/* ── Title ── */}
        <div className="text-center mb-3">
          <h2 className="text-lg font-light text-foreground tracking-tight">
            How was your Today?
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            기록할 방향을 골라보세요
          </p>
        </div>

        {/* ── Guide Cards (horizontal scroll) ── */}
        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5 mb-3">
          <div className="flex gap-3 w-max">
            {guideChips.map((chip, i) => (
              <button
                key={chip.tag}
                onClick={() => handleChipClick(i)}
                className={`flex-shrink-0 w-[65vw] max-w-[260px] rounded-[20px] p-4 text-left transition-all ${
                  selectedChipIndex === i
                    ? "glass-card shadow-md border-foreground/10"
                    : "glass-card hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{chip.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{chip.tag}</span>
                  <span className="text-[10px] text-muted-foreground/60">({chip.label})</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {chip.placeholder}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Spacer ── */}
        <div className="flex-1 min-h-4" />

        {/* ── Recording status ── */}
        {isRecording && (
          <div className="text-center mb-3 animate-float-up">
            <p className="text-sm text-muted-foreground">듣는 중...</p>
          </div>
        )}

        {/* ── Text input area (shown when text mode active) ── */}
        {inputMode === "text" && (
          <div className="space-y-3 mb-4 animate-float-up">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="기록 내용을 입력해보세요..."
              className="min-h-[120px] rounded-2xl border-border/40 bg-background/60 backdrop-blur-sm resize-none text-sm"
            />
            <button
              onClick={handleTextSubmit}
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl btn-steel text-sm tracking-wide transition-all"
            >
              {isSubmitting ? "저장 중..." : "기록 시작하기"}
            </button>
          </div>
        )}

        {/* ── Voice / Text Buttons (vertically stacked steel bars) ── */}
        {inputMode !== "text" && (
          <div className="space-y-3 pb-2">
            <button
              onClick={handleVoiceClick}
              className={`w-full h-14 rounded-2xl btn-steel text-sm tracking-widest transition-all ${
                isRecording ? "ring-2 ring-foreground/20" : ""
              }`}
            >
              {isRecording ? "녹음 중지" : "Voice"}
            </button>
            <button
              onClick={() => setInputMode("text")}
              className="w-full h-14 rounded-2xl btn-steel text-sm tracking-widest transition-all"
            >
              Text
            </button>
          </div>
        )}
      </div>

      {/* ── Recording confirmation sheet ── */}
      <Sheet open={showConfirmation} onOpenChange={setShowConfirmation}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl font-bold text-center">녹음을 완료할까요?</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 pb-6">
            <Button onClick={handleRetry} variant="outline" className="w-full h-12 rounded-xl border-border">
              다시 녹음
            </Button>
            <button
              onClick={handleVoiceSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl btn-steel text-sm"
            >
              콘텐츠 생성하기
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Submitting overlay ── */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[9999] warm-gradient-bg flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <GlassOrb state="recording" size="w-32 h-32" />
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
