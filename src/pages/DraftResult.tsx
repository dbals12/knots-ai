import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";

// 결과 데이터 타입 정의
interface Draft {
  id: string;
  user_id: string | null;
  status: "idle" | "generating" | "completed" | "failed";
  input_data: any;
  result_data: {
    blog_content?: string;
    linkedin_content?: string;
    reels_content?: string;
    threads_content?: string;
  } | null;
  error_message?: string;
}

const platformIcons = {
  blog: { icon: SiNaver, color: "#03C75A", label: "블로그" },
  linkedin: { icon: SiLinkedin, color: "#0077B5", label: "LinkedIn" },
  reels: { icon: SiInstagram, color: "#E4405F", label: "Instagram" },
  threads: { icon: SiThreads, color: "#000000", label: "Threads" },
};

const DraftResult = () => {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Draft 데이터 불러오기
  useEffect(() => {
    if (!draftId) return;

    const fetchDraft = async () => {
      const { data, error } = await supabase.from("drafts").select("*").eq("id", draftId).single();

      if (error) {
        console.error("Error fetching draft:", error);
        toast({ title: "오류", description: "기록을 찾을 수 없습니다.", variant: "destructive" });
        navigate("/");
        return;
      }

      setDraft(data as any);
      setLoading(false);
    };

    fetchDraft();

    // 실시간 구독 (생성 상태 변경 감지용)
    const channel = supabase
      .channel(`draft-${draftId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drafts", filter: `id=eq.${draftId}` },
        (payload) => {
          setDraft(payload.new as any);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [draftId, navigate, toast]);

  // 2. AI 생성 실행 (Status가 'idle'일 때 자동 실행)
  useEffect(() => {
    if (!draft || draft.status !== "idle" || isProcessing) return;

    const runAI = async () => {
      setIsProcessing(true);
      console.log("Starting AI generation for draft:", draft.id);

      try {
        // 상태를 generating으로 변경
        await supabase.from("drafts").update({ status: "generating" }).eq("id", draft.id);

        // Edge Function 호출 params 준비
        const { inputMode, textInput, audioBase64, selectedMood, selectedPersona, sessionPurpose } = draft.input_data;
        const formData = new FormData();

        // 폼 데이터 구성
        formData.append("user_persona", selectedPersona);
        formData.append("user_mood", selectedMood);
        formData.append("session_purpose", sessionPurpose || "");

        if (inputMode === "voice" && audioBase64) {
          // Base64 -> Blob 변환
          const res = await fetch(audioBase64);
          const blob = await res.blob();
          formData.append("audio", blob, "recording.webm");
        } else {
          formData.append("raw_text", textInput || "");
        }

        // Edge Function 호출
        const response = await fetch(`https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("AI Processing Failed");

        const aiResult = await response.json();
        const { content } = aiResult; // content: { blog_content, ... }

        // 결과 저장 및 완료 처리
        await supabase
          .from("drafts")
          .update({
            status: "completed",
            result_data: content,
          })
          .eq("id", draft.id);
      } catch (error) {
        console.error("AI Gen Error:", error);
        await supabase.from("drafts").update({ status: "failed", error_message: "생성 실패" }).eq("id", draft.id);
        toast({
          title: "생성 실패",
          description: "AI가 응답하지 않습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    runAI();
  }, [draft, isProcessing]);

  // 3. Claim (저장) 로직: 로그인 유저가 주인 없는 Draft를 보면 내 것으로 만듦
  useEffect(() => {
    const claimDraft = async () => {
      if (user && draft && draft.user_id === null) {
        const { error } = await supabase.from("drafts").update({ user_id: user.id }).eq("id", draft.id);

        if (!error) {
          toast({ title: "저장 완료", description: "내 기록에 안전하게 저장되었습니다!" });
          // 로컬 스토리지 청소
          localStorage.removeItem("pending_draft_id");
        }
      }
    };
    claimDraft();
  }, [user, draft, toast]);

  // 로그인 핸들러
  const handleLoginToSave = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao", // 또는 google
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/result/${draftId}`,
      },
    });
  };

  // 렌더링: 로딩 중
  if (loading || (draft && (draft.status === "idle" || draft.status === "generating"))) {
    return (
      <AppShell showHeader={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-[600px]">
          <Loader2 className="w-12 h-12 text-foreground animate-spin" />
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">AI가 기록을 정리하고 있어요</h2>
            <p className="text-muted-foreground text-sm">약 10~20초 정도 걸립니다. 잠시만 기다려주세요.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // 렌더링: 결과 화면
  return (
    <AppShell>
      <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">생성된 결과</h1>
          {/* 비로그인 유저에게만 저장 버튼 노출 */}
          {!user && (
            <Button onClick={handleLoginToSave} className="bg-[#FEE500] text-black hover:bg-[#FEE500]/90">
              카카오로 3초 만에 저장하기
            </Button>
          )}
        </div>

        {/* 결과 카드 리스트 */}
        {draft?.result_data && (
          <div className="grid gap-4">
            {Object.entries(draft.result_data).map(([key, content]) => {
              if (!content) return null;
              const type = key.replace("_content", "") as keyof typeof platformIcons;
              const meta = platformIcons[type] || platformIcons.blog;
              const Icon = meta.icon;

              return (
                <div key={key} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: meta.color }}
                    >
                      <Icon className="text-white w-4 h-4" />
                    </div>
                    <span className="font-semibold">{meta.label}</span>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default DraftResult;
