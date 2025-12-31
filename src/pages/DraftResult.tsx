import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import ResultDetailModal from "@/components/ResultDetailModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  blog: { icon: SiNaver, color: "#03C75A", label: "블로그 (회고형)" },
  linkedin: { icon: SiLinkedin, color: "#0077B5", label: "LinkedIn (인사이트형)" },
  reels: { icon: SiInstagram, color: "#E4405F", label: "인스타 (카드뉴스 & 캡션)" },
  threads: { icon: SiThreads, color: "#000000", label: "Threads (짧은 에세이)" },
};

const getInstagramPreview = (content: string | null): string => {
  if (!content) return "생성된 콘텐츠 없음";
  const cleanContent = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  try {
    const parsed = JSON.parse(cleanContent);
    if (typeof parsed === "object" && parsed !== null) {
      const slide1 = parsed["Slide 1"] || parsed["slide 1"];
      if (slide1) return slide1.replace(/^[:\s"]+|[",\s}]+$/g, "").trim();
    }
  } catch {
    const match = content.match(/\[Slide 1\]([\s\S]*?)(?=\[Slide|\[Caption|$)/i);
    if (match?.[1]) return match[1].trim();
  }
  return content.substring(0, 100) + "...";
};

const DraftResult = () => {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  // 1. Draft Fetching
  useEffect(() => {
    if (!draftId) return;
    const fetchDraft = async () => {
      const { data, error } = await supabase.from("drafts").select("*").eq("id", draftId).single();
      if (error) {
        toast({ title: "오류", description: "기록을 찾을 수 없습니다.", variant: "destructive" });
        navigate("/");
        return;
      }
      setDraft(data as any);
      setLoading(false);
    };
    fetchDraft();

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

  // 2. AI Generation
  useEffect(() => {
    if (!draft || draft.status !== "idle" || isProcessing) return;
    const runAI = async () => {
      setIsProcessing(true);
      try {
        await supabase.from("drafts").update({ status: "generating" }).eq("id", draft.id);
        const { inputMode, textInput, audioBase64, selectedMood, selectedPersona, sessionPurpose } = draft.input_data;
        const formData = new FormData();
        formData.append("user_persona", selectedPersona);
        formData.append("user_mood", selectedMood);
        formData.append("session_purpose", sessionPurpose || "");

        if (inputMode === "voice" && audioBase64) {
          const res = await fetch(audioBase64);
          const blob = await res.blob();
          formData.append("audio", blob, "recording.webm");
        } else {
          formData.append("raw_text", textInput || "");
        }

        const response = await fetch(`https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("AI Processing Failed");
        const aiResult = await response.json();

        const updatedInputData = {
          ...draft.input_data,
          textInput: aiResult.transcript || draft.input_data.textInput,
        };

        setDraft((prev) =>
          prev ? { ...prev, status: "completed", result_data: aiResult.content, input_data: updatedInputData } : null,
        );

        await supabase
          .from("drafts")
          .update({
            status: "completed",
            result_data: aiResult.content,
            input_data: updatedInputData,
          })
          .eq("id", draft.id);
      } catch (error) {
        await supabase.from("drafts").update({ status: "failed", error_message: "생성 실패" }).eq("id", draft.id);
      } finally {
        setIsProcessing(false);
      }
    };
    runAI();
  }, [draft, isProcessing]);

  // 3. Claim Logic
  useEffect(() => {
    const claimDraft = async () => {
      if (user && draft && draft.user_id === null) {
        const { error } = await supabase.from("drafts").update({ user_id: user.id }).eq("id", draft.id);
        if (!error) {
          toast({ title: "저장 완료", description: "내 기록함에 안전하게 저장되었습니다." });
          localStorage.removeItem("pending_draft_id");
        }
      }
    };
    claimDraft();
  }, [user, draft, toast]);

  // 팝업 트리거 (모달 버튼용)
  const triggerLoginAlert = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (user) return;
    setShowLoginAlert(true);
  };

  // 실제 로그인 수행 (하단 버튼용)
  const performLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/result/${draftId}` },
    });
  };

  const handleCopyAction = (content: string) => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      toast({ title: "복사 완료", description: "클립보드에 복사되었습니다." });
    });
  };

  const handlePlatformClick = (platformKey: string) => {
    setSelectedPlatform(platformKey);
    setIsModalOpen(true);
  };

  const getContent = (key: string) => {
    if (!draft?.result_data) return "";
    if (key === "blog") return draft.result_data.blog_content;
    if (key === "linkedin") return draft.result_data.linkedin_content;
    if (key === "reels") return draft.result_data.reels_content;
    if (key === "threads") return draft.result_data.threads_content;
    return "";
  };

  const hasResult = draft?.result_data && Object.keys(draft.result_data).length > 0;

  if (loading || (!hasResult && draft && (draft.status === "idle" || draft.status === "generating"))) {
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

  return (
    <AppShell>
      <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto pb-32">
        <h1 className="text-2xl font-bold text-foreground">오늘의 결과</h1>

        <div className="bg-[#F8F8F8] rounded-2xl p-6 flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h3 className="text-sm font-semibold mb-2 text-foreground">오늘 내가 기록한 내용</h3>
            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
              {draft?.input_data?.textInput || "음성 기록을 변환 중입니다..."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => (user ? navigate("/input") : triggerLoginAlert(e))}
            className="text-xs h-8 ml-4 shrink-0 rounded-lg border-gray-200"
          >
            {user ? "수정하기" : "저장"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.keys(platformIcons).map((key) => {
            const meta = platformIcons[key as keyof typeof platformIcons];
            const Icon = meta.icon;
            const content = getContent(key);
            const isInstagram = key === "reels";
            const preview = isInstagram ? getInstagramPreview(content || "") : content || "";

            return (
              <button
                key={key}
                onClick={() => handlePlatformClick(key)}
                className="bg-[#F8F8F8] rounded-2xl p-5 text-left hover:bg-[#F0F0F0] transition-colors flex flex-col h-52 relative overflow-hidden group"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${isInstagram ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : "bg-white"}`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isInstagram ? "text-white" : "text-foreground"}`}
                      style={{ color: isInstagram ? undefined : meta.color }}
                    />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-1">{meta.label}</h3>
                <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{preview}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ✅ 3. 하단 고정 CTA (요청 사항 반영) */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-50 safe-area-bottom">
          <div className="max-w-md mx-auto">
            <Button
              // ✅ 누르면 바로 로그인 수행
              onClick={() => performLogin()}
              className="w-full h-12 rounded-xl text-base font-bold bg-[#FEE500] text-black hover:bg-[#FEE500]/90 shadow-sm"
            >
              {/* ✅ 문구 변경 */}
              3초 만에 로그인하고 결과 복사/저장하기
            </Button>
          </div>
        </div>
      )}

      {/* 4. 로그인 유도 팝업 */}
      <AlertDialog open={showLoginAlert} onOpenChange={setShowLoginAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>로그인이 필요한 기능입니다</AlertDialogTitle>
            <AlertDialogDescription>
              결과를 저장하거나 복사하려면 로그인이 필요해요.
              <br />
              3초 만에 로그인하고 안전하게 보관하세요!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-0">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={performLogin}
              className="rounded-xl bg-[#FEE500] text-black hover:bg-[#FEE500]/90"
            >
              {/* ✅ 팝업 버튼 문구 변경 */}
              카카오/구글로 시작하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedPlatform && (
        <ResultDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPlatform(null);
          }}
          platform={selectedPlatform}
          content={getContent(selectedPlatform) || ""}
          outputId={draftId || ""}
          onSave={() => triggerLoginAlert()}
          onCopy={(content) => handleCopyAction(content)}
          onContentUpdate={() => {}}
        />
      )}
    </AppShell>
  );
};

export default DraftResult;
