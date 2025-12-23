import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import {
  clearGuestPendingSubmission,
  dataUrlToBlob,
  getGuestPendingSubmission,
  type GuestPendingSubmission,
} from "@/lib/guestPendingSubmission";
import { trackSubmitInput, getEntrySource } from "@/lib/analytics";

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
  { value: "growth", label: "🌱 성장한 나" },
  { value: "achiever", label: "💼 일잘러 나" },
  { value: "collaborator", label: "🤝 협업한 나" },
  { value: "challenger", label: "⚡ 갈등한 나" },
  { value: "authentic", label: "💬 날것의 나" },
];

const Processing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(() => getGuestPendingSubmission(), []);

  useEffect(() => {
    if (!user) return;

    if (!pending) {
      console.log("[restore] no guest_pending_submission found");
      navigate("/", { replace: true });
      return;
    }

    console.log("[restore] found guest_pending_submission:", pending);
    toast({
      title: "아까 작성하신 기록을 불러왔어요!",
    });

    const run = async (data: GuestPendingSubmission) => {
      try {
        setError(null);

        const personaLabel = personas.find((p) => p.value === data.selectedPersona)?.label || data.selectedPersona;
        const moodLabel = moods.find((m) => m.value === data.selectedMood)?.label || data.selectedMood;
        const purposeLabel =
          sessionPurposes.find((p) => p.value === data.sessionPurpose)?.label || data.sessionPurpose || "";

        const formData = new FormData();

        if (data.inputMode === "voice" && data.audioBase64 && data.audioLost !== true) {
          const audioBlob = dataUrlToBlob(data.audioBase64);
          formData.append("audio", audioBlob, "recording.webm");
        } else {
          formData.append("raw_text", (data.textInput || "").trim());
        }

        formData.append("user_persona", personaLabel);
        formData.append("user_mood", moodLabel);
        formData.append("session_purpose", purposeLabel);

        const response = await fetch(`https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error((errorData as any)?.error || "AI processing failed");
        }

        const aiResult = await response.json();
        const { transcript, content } = aiResult;

        const analyticsPromise = Promise.resolve().then(() => {
          trackSubmitInput(data.inputMode === "voice" ? "voice" : "text", (transcript || "").length);
        });

        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            raw_text: transcript,
            selected_mood: data.selectedMood,
            selected_persona: data.selectedPersona,
            session_purpose: data.sessionPurpose || null,
            keyword: data.keyword || null,
            input_type: data.inputMode === "voice" ? "voice" : "text",
            entry_source: getEntrySource(),
            audio_url: null,
            input_duration: null,
            device_type: null,
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

        await analyticsPromise.catch(console.error);

        console.log("[restore] success → clearing guest_pending_submission and navigating to /result");
        clearGuestPendingSubmission();
        navigate("/result", { replace: true });
      } catch (e) {
        console.error("[restore] failed:", e);
        setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
        toast({
          title: "처리에 실패했습니다",
          description: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.",
          variant: "destructive",
        });
        // Keep guest_pending_submission for retry.
        navigate("/input", { replace: true });
      }
    };

    void run(pending);
  }, [navigate, pending, toast, user]);

  return (
    <AppShell showHeader={false}>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-foreground" />
        <p className="text-sm text-muted-foreground">분석 중입니다...</p>
        {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
      </div>
    </AppShell>
  );
};

export default Processing;
