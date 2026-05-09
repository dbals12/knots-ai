import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Mic, Type, Home as HomeIcon, RotateCw, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import { blobToBase64 } from "@/lib/guestPendingSubmission";
import { getEntrySource } from "@/lib/analytics";
import track, { trackEvent } from "@/lib/track";
import { getSessionId, getNextInputSeq } from "@/lib/session";
import { getAccessToken } from "@/lib/edgeFunctionAuth";

// ── Mood chips (3 keys per spec) ──
const moods = [
  { key: "burning_day", label: "🔥 불타는 하루" },
  { key: "tired_day", label: "😮‍💨 좀 힘들고 지쳤다" },
  { key: "proud_day", label: "😊 뿌듯했다" },
];

// ── Guide chips with example arrays ──
type GuideKey = "rant" | "learning" | "small_win" | "struggle" | "thought_organize";

const guideChips: { key: GuideKey; label: string; mood: string; persona: string; purpose: string }[] = [
  { key: "rant", label: "#오늘의넋두리", mood: "tired_day", persona: "authentic", purpose: "emotion" },
  { key: "learning", label: "#배운한가지", mood: "burning_day", persona: "growth", purpose: "idea" },
  { key: "small_win", label: "#소소한성취", mood: "proud_day", persona: "achiever", purpose: "record" },
  { key: "struggle", label: "#삽질기록", mood: "tired_day", persona: "challenger", purpose: "review" },
  { key: "thought_organize", label: "#머릿속정리", mood: "tired_day", persona: "authentic", purpose: "emotion" },
];

const examples: Record<GuideKey, { id: string; text: string }[]> = {
  rant: [
    { id: "rant_01", text: "오늘 하루 종일 바빴는데, 막상 끝내고 보니까 남은 게 별로 없는 느낌이었어. 내가 뭘 해냈는지 설명하려니까 잘 안 떠오르더라." },
    { id: "rant_02", text: "오늘은 별일 아닌 말에도 괜히 예민하게 반응했어. 일이 많아서 그런 건지, 마음에 여유가 없어서 그런 건지 잘 모르겠더라." },
    { id: "rant_03", text: "남들은 자기 경험을 잘 정리해서 보여주는 것 같은데, 나는 하루가 지나가면 다 흩어지는 느낌이야. 나도 내가 겪은 걸 그냥 넘기지 말고 조금씩 남겨두고 싶어졌어." },
  ],
  learning: [
    { id: "learning_01", text: "오늘 회의하면서 느낀 건, 좋은 의견도 정리되지 않으면 설득력이 약하다는 거였어. 말을 많이 하는 것보다, 상대가 바로 이해할 수 있게 구조화하는 게 더 중요하더라." },
    { id: "learning_02", text: "오늘 처음 맡은 일을 해보면서, 내가 막히는 지점이 어디인지 알게 됐어. 기준을 먼저 잡지 않으면 계속 헤매게 된다는 걸 배웠어." },
    { id: "learning_03", text: "오늘 피드백을 받으면서, 내가 놓친 건 디테일이 아니라 처음 문제를 바라보는 관점이었더라. 결과물을 고치기 전에 질문부터 다시 잡아야 했어." },
  ],
  small_win: [
    { id: "small_win_01", text: "오늘 흩어져 있던 내용을 한눈에 볼 수 있게 정리했어. 작은 일이지만, 다음 사람이 바로 이해할 수 있게 만들었다는 점에서 꽤 의미 있었어." },
    { id: "small_win_02", text: "오늘 회의 전에 필요한 내용을 미리 정리해갔어. 덕분에 말할 때 덜 긴장했고, 내가 어떤 의견을 내야 하는지도 더 분명하게 보였어." },
    { id: "small_win_03", text: "오늘 미루던 일을 하나 끝냈어. 큰 성과는 아니지만, 계속 마음에 걸리던 걸 처리해서 다음 일을 시작하기가 훨씬 가벼워졌어." },
  ],
  struggle: [
    { id: "struggle_01", text: "오늘 숫자가 계속 안 맞아서 한참을 다시 봤어. 처음엔 계산 실수인 줄 알았는데, 알고 보니 서로 다른 기준의 데이터를 섞어서 보고 있었더라." },
    { id: "struggle_02", text: "오늘 문제 원인을 찾느라 한참 돌아갔어. 그래도 하나씩 확인하다 보니 어디서 꼬였는지 보였고, 다음엔 먼저 기준부터 맞춰봐야겠다고 느꼈어." },
    { id: "struggle_03", text: "오늘 작업이 생각보다 오래 걸렸어. 처음부터 방향이 틀린 건 아니었는데, 중간에 확인해야 할 조건을 놓쳐서 다시 돌아가야 했어." },
  ],
  thought_organize: [
    { id: "thought_01", text: "요즘 내가 하고 있는 일이 쌓이고 있는 건지, 그냥 지나가고 있는 건지 잘 모르겠어. 경험은 늘고 있는데, 그걸 어떻게 정리해야 할지 몰라서 자꾸 흩어지는 느낌이야." },
    { id: "thought_02", text: "해야 할 일은 많은데 뭘 먼저 해야 할지 잘 안 잡혀. 빨리 움직여야 한다는 생각은 드는데, 우선순위를 정하려고 하면 머리가 복잡해져." },
    { id: "thought_03", text: "요즘은 더 배우는 것도 중요하지만, 내가 이미 해온 걸 정리하는 것도 필요하다는 생각이 들어. 그런데 막상 정리하려고 하면 어디서부터 시작해야 할지 모르겠어." },
  ],
};

interface HomeProps {
  isGuest?: boolean;
}

const Home = ({ isGuest = false }: HomeProps) => {
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideKey | null>(null);
  const [currentExample, setCurrentExample] = useState<{ id: string; text: string } | null>(null);

  const [textInput, setTextInput] = useState("");
  const [textStartLogged, setTextStartLogged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartRef = useRef<number>(0);
  const moodScrollRef = useRef<HTMLDivElement | null>(null);
  const guideScrollRef = useRef<HTMLDivElement | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);

  const scrollChips = (ref: React.RefObject<HTMLDivElement>, dir: 1 | -1) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

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
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    };
  }, []);

  // ── Guide chip select ──
  const handleGuideSelect = (key: GuideKey) => {
    if (selectedGuide === key) {
      setSelectedGuide(null);
      setCurrentExample(null);
      return;
    }
    const pool = examples[key];
    const ex = pool[Math.floor(Math.random() * pool.length)];
    setSelectedGuide(key);
    setCurrentExample(ex);
    const chip = guideChips.find((c) => c.key === key);
    trackEvent("guide_chip_select", {
      input_guide_type: key,
      guide_label: chip?.label,
      selected_mood: selectedMood,
    });
  };

  const handleRotateExample = () => {
    if (!selectedGuide) return;
    const pool = examples[selectedGuide];
    if (pool.length < 2) return;
    const prevId = currentExample?.id;
    const candidates = pool.filter((e) => e.id !== prevId);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    setCurrentExample(next);
    trackEvent("example_rotate_click", {
      input_guide_type: selectedGuide,
      previous_example_id: prevId,
      new_example_id: next.id,
    });
  };

  // ── Status copy by recording state ──
  const getStatusCopy = (): string => {
    if (recordedBlob && !isRecording) return "이 기록을 글감으로 정리해볼까요?";
    if (!isRecording) return "버튼을 누르고 자유롭게 이야기해주세요";
    if (recordSeconds < 10) return "좋아요. 생각나는 대로 편하게 말해보세요.";
    if (recordSeconds < 25) return "조금만 더 말하면 더 깊게 정리할 수 있어요.";
    return "충분해요. 이제 글감으로 정리해볼게요.";
  };

  // ── Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const mimeOptions = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const selectedMime = mimeOptions.find(m => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : {});
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const actualMime = recorder.mimeType || selectedMime || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        const dur = Math.round((Date.now() - recordStartRef.current) / 1000);
        if (audioChunksRef.current.length === 0 || blob.size < 5000) {
          toast({ title: "녹음 실패", description: "녹음이 너무 짧거나 실패했습니다. 다시 시도해주세요.", variant: "destructive" });
          setRecordedBlob(null);
          return;
        }
        setRecordedBlob(blob);
        setRecordedDuration(dur);
        setShowConfirmation(true);
        trackEvent("recording_stop", {
          input_guide_type: selectedGuide,
          selected_example_id: currentExample?.id,
          recording_duration_seconds: dur,
        });
      };
      recordStartRef.current = Date.now();
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds(Math.round((Date.now() - recordStartRef.current) / 1000));
      }, 500);
      recorder.start(1000);
      setIsRecording(true);
      trackEvent("recording_start", {
        input_guide_type: selectedGuide,
        selected_example_id: currentExample?.id,
        selected_mood: selectedMood,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({ title: "마이크 오류", description: "마이크 권한을 확인해주세요.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((t) => t.stop());
      if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
      setIsRecording(false);
    }
  };

  const handleMicClick = () => {
    if (inputMode !== "voice") setInputMode("voice");
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleRetry = () => {
    setShowConfirmation(false);
    setRecordedBlob(null);
    setRecordedDuration(0);
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setTextInput(v);
    if (!textStartLogged && v.trim().length > 0) {
      setTextStartLogged(true);
      trackEvent("text_input_start", {
        input_guide_type: selectedGuide,
        selected_example_id: currentExample?.id,
      });
    }
  };

  // ── Submit ──
  const handleSubmit = async (mode: "voice" | "text") => {
    setIsSubmitting(true);
    const analyticsSessionId = getSessionId();
    const { seq, isFirst } = getNextInputSeq(analyticsSessionId);
    const guideChip = guideChips.find((c) => c.key === selectedGuide);
    const sessionPurpose = guideChip?.purpose ?? "record";
    const selectedPersona = guideChip?.persona ?? "authentic";
    const moodValue = selectedMood ?? guideChip?.mood ?? "neutral";

    try {
      let audioBase64: string | null = null;
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

      const inputLengthChars = mode === "text" ? finalTextInput.length : 0;
      const submitExtras = {
        analytics_session_id: analyticsSessionId,
        input_seq: seq,
        is_first_input: isFirst,
        selected_mood: moodValue,
        selected_persona: selectedPersona,
        session_purpose: sessionPurpose,
        input_guide_type: selectedGuide,
        selected_example_id: currentExample?.id ?? null,
        input_length_chars: inputLengthChars,
        recording_duration_seconds: mode === "voice" ? recordedDuration : null,
      };

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
            selected_mood: moodValue,
            selected_persona: selectedPersona,
            selected_guide_chip: selectedGuide,
            input_guide_type: selectedGuide,
            selected_example_id: currentExample?.id ?? null,
            selected_example_text: currentExample?.text ?? null,
            input_length_chars: inputLengthChars,
            recording_duration_seconds: mode === "voice" ? recordedDuration : null,
            keyword: "",
            raw_text: finalTextInput,
            entry_source: getEntrySource(),
            input_type: mode,
          })
          .select("id")
          .single();
        if (sessionError) throw sessionError;
        track.submitInput(mode, { db_session_id: sessionData.id, ...submitExtras });

        const formData = new FormData();
        formData.append("session_id", sessionData.id);
        formData.append("user_persona", selectedPersona);
        formData.append("user_mood", moodValue);
        formData.append("session_purpose", sessionPurpose);
        if (mode === "voice" && recordedBlob) formData.append("audio", recordedBlob, "recording.webm");
        else formData.append("raw_text", finalTextInput);

        void supabase.functions
          .invoke("process-audio", { body: formData, headers: { Authorization: `Bearer ${accessToken}` } })
          .catch((e) => console.error("process-audio invoke failed:", e));
        supabase.from("users").update({ usage_purpose: sessionPurpose || undefined }).eq("id", user.id).then();
        navigate(`/result/${sessionData.id}?type=session`);
      } else {
        const inputData = {
          inputMode: mode,
          selectedMood: moodValue,
          selectedPersona,
          selectedGuideChip: selectedGuide,
          input_guide_type: selectedGuide,
          selected_example_id: currentExample?.id ?? null,
          selected_example_text: currentExample?.text ?? null,
          sessionPurpose,
          keyword: "",
          audioBase64,
          textInput: finalTextInput,
          input_length_chars: inputLengthChars,
          recording_duration_seconds: mode === "voice" ? recordedDuration : null,
        };
        const { data: draftData, error: draftError } = await supabase
          .from("drafts")
          .insert({ status: "processing", input_data: inputData })
          .select("id")
          .single();
        if (draftError) throw draftError;
        localStorage.setItem("pending_draft_id", draftData.id);
        track.submitInput(mode, { db_session_id: null, draft_id: draftData.id, ...submitExtras });

        const fd = new FormData();
        fd.append("draft_id", draftData.id);
        fd.append("user_persona", selectedPersona);
        fd.append("user_mood", moodValue);
        fd.append("session_purpose", sessionPurpose);
        fd.append("input_type", mode);
        fd.append("keyword", "");
        if (mode === "voice" && recordedBlob) fd.append("audio", recordedBlob, "recording.webm");
        else fd.append("raw_text", finalTextInput);

        fetch("https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio", { method: "POST", body: fd }).catch(console.error);
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
    <AppShell isGuest={isGuest} showHeader={false}>
      {/* ── Custom minimal header (home / knots / login) ── */}
      <header className="relative flex items-center justify-center h-14 px-5 border-b border-border/40">
        <button
          onClick={() => navigate("/")}
          aria-label="홈"
          className="absolute left-4 w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
        >
          <HomeIcon className="w-5 h-5 text-foreground/70" />
        </button>
        <button onClick={() => navigate("/")} className="text-base font-bold tracking-wide text-foreground">
          knots
        </button>
        <button
          onClick={() => (user ? navigate("/settings") : navigate("/login"))}
          className="absolute right-4 text-sm text-foreground/80 hover:text-foreground"
        >
          {user ? "마이" : "로그인"}
        </button>
      </header>

      <div className="flex-1 flex flex-col px-5 pt-6 pb-6 overflow-y-auto">
        {/* ── Mood ── */}
        <h2 className="text-base font-bold text-foreground mb-3">오늘 하루 어땠나요?</h2>
        <div className="relative mb-6">
          <div ref={moodScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-5 px-5">
            {moods.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMood(selectedMood === m.key ? null : m.key)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedMood === m.key
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-background border border-border text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollChips(moodScrollRef, -1)}
            aria-label="이전 칩 보기"
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-7 h-7 rounded-full bg-background/95 border border-border shadow-sm items-center justify-center hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4 text-foreground/70" />
          </button>
          <button
            type="button"
            onClick={() => scrollChips(moodScrollRef, 1)}
            aria-label="다음 칩 보기"
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-7 h-7 rounded-full bg-background/95 border border-border shadow-sm items-center justify-center hover:bg-muted"
          >
            <ChevronRight className="w-4 h-4 text-foreground/70" />
          </button>
        </div>

        {/* ── Guide chips ── */}
        <h2 className="text-base font-bold text-foreground mb-3">오늘은 어떤 기록으로 남길까요?</h2>
        <div className="relative mb-3">
          <div ref={guideScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-5 px-5">
            {guideChips.map((c) => (
              <button
                key={c.key}
                onClick={() => handleGuideSelect(c.key)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedGuide === c.key
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-background border border-border text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollChips(guideScrollRef, -1)}
            aria-label="이전 칩 보기"
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-7 h-7 rounded-full bg-background/95 border border-border shadow-sm items-center justify-center hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4 text-foreground/70" />
          </button>
          <button
            type="button"
            onClick={() => scrollChips(guideScrollRef, 1)}
            aria-label="다음 칩 보기"
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-7 h-7 rounded-full bg-background/95 border border-border shadow-sm items-center justify-center hover:bg-muted"
          >
            <ChevronRight className="w-4 h-4 text-foreground/70" />
          </button>
        </div>

        {/* ── Example card ── */}
        <div className="rounded-2xl bg-background border border-border/60 shadow-[0_2px_10px_hsla(0,0%,0%,0.04)] p-4 mb-6">
          {!selectedGuide || !currentExample ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>기록 방향을 고르면 예시를 보여드릴게요</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">예시 가이드</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                예: {currentExample.text}
              </p>
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleRotateExample}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  다른 예시 보기
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Mic with halo (only in voice mode) ── */}
        {inputMode === "voice" && (
          <div className="flex flex-col items-center mt-2 mb-4">
            <div className="relative flex items-center justify-center w-[220px] h-[220px]">
              {/* Halo layers */}
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-b from-white to-[hsl(0,0%,90%)] border border-[hsla(0,0%,100%,0.9)] shadow-[0_22px_48px_-12px_hsla(220,15%,40%,0.28),inset_0_2px_4px_hsla(0,0%,100%,0.9)] ${
                  isRecording ? "animate-mic-wave-strong" : "animate-mic-breath"
                }`}
                aria-hidden
              />
              <div
                className={`absolute inset-6 rounded-full bg-gradient-to-b from-white to-[hsl(0,0%,93%)] border border-[hsla(0,0%,100%,0.7)] shadow-[inset_0_1px_2px_hsla(0,0%,100%,0.9)] ${
                  isRecording ? "animate-mic-wave-mid" : "animate-mic-breath-slow"
                }`}
                aria-hidden
              />
              {/* Mic button */}
              <button
                onClick={handleMicClick}
                aria-label={isRecording ? "녹음 중지" : "녹음 시작"}
                className={`relative z-10 w-[110px] h-[110px] rounded-full flex items-center justify-center btn-dark-pill !rounded-full transition-transform ${
                  isRecording ? "scale-95" : "hover:scale-[1.03]"
                }`}
              >
                <Mic className="w-10 h-10 text-background" />
              </button>
            </div>
          </div>
        )}

        {/* ── Text mode ── */}
        {inputMode === "text" && (
          <div className="space-y-3 mb-3 animate-float-up">
            <Textarea
              value={textInput}
              onChange={handleTextChange}
              placeholder="자유롭게 적어보세요..."
              className="min-h-[160px] rounded-2xl border-border/60 bg-muted/30 resize-none text-sm"
            />
            <button
              onClick={handleTextSubmit}
              disabled={isSubmitting || !textInput.trim()}
              className="w-full h-12 btn-dark-pill text-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? "저장 중..." : "AI로 정리하기"}
            </button>
          </div>
        )}

        {/* ── Voice/Text toggle ── */}
        <div className="flex justify-center gap-2 mt-2">
          <button
            onClick={() => setInputMode("voice")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              inputMode === "voice"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Mic className="w-4 h-4" /> 음성
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              inputMode === "text"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Type className="w-4 h-4" /> 텍스트
          </button>
        </div>

        {/* ── Status copy ── */}
        {inputMode === "voice" && (
          <p className="text-center text-sm text-muted-foreground mt-4">{getStatusCopy()}</p>
        )}
      </div>

      {/* ── Recording confirmation sheet ── */}
      <Sheet open={showConfirmation} onOpenChange={setShowConfirmation}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl font-bold text-center">이 기록을 글감으로 정리해볼까요?</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 pb-6">
            <Button onClick={handleRetry} variant="outline" className="w-full h-12 rounded-xl border-border">
              다시 녹음
            </Button>
            <button onClick={handleVoiceSubmit} disabled={isSubmitting} className="w-full h-12 btn-dark-pill text-sm">
              AI로 정리하기
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Submitting overlay ── */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[9999] bg-background/95 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-b from-white to-[hsl(0,0%,94%)] border border-[hsla(0,0%,100%,0.9)] shadow-[0_18px_40px_-12px_hsla(220,15%,40%,0.2)] animate-mic-breath" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-foreground">AI가 기록을 글감으로 정리 중이에요</p>
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
