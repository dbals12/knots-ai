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
  blog: { icon: SiNaver, color: "#03C75A", title: "블로그 (회고형)" },
  linkedin: { icon: SiLinkedin, color: "#0077B5", title: "LinkedIn (인사이트형)" },
  reels: { icon: SiInstagram, color: "#E4405F", title: "인스타 (카드뉴스 & 캡션)" },
  threads: { icon: SiThreads, color: "#000000", title: "Threads (짧은 에세이)" },
};

const getSummary = (content: string | null) => {
  if (!content) return "콘텐츠가 생성되지 않았습니다.";
  const cleanContent = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  try {
    const parsed = JSON.parse(cleanContent);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        (parsed["Slide 1"] || parsed["slide 1"] || parsed["Caption"] || parsed["caption"] || content).substring(
          0,
          100,
        ) + "..."
      );
    }
  } catch {}
  return content.length > 100 ? content.substring(0, 100) + "..." : content;
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

  // 1. Draft Fetching (무한 로딩 방지 핵심 로직)
  useEffect(() => {
    if (!draftId) return;
    const fetchDraft = async () => {
      const { data, error } = await supabase.from("drafts").select("*").eq("id", draftId).single();

      if (error || !data) {
        console.error("Error fetching draft:", error);
        // 🚨 [중요] 잘못된 ID면 즉시 로컬스토리지 삭제 -> 무한 루프 탈출
        localStorage.removeItem("pending_draft_id");
        toast({ title: "오류", description: "기록을 찾을 수 없어 홈으로 이동합니다.", variant: "destructive" });
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

  // 3. Claim Logic (토스트 제거됨)
  useEffect(() => {
    const claimDraft = async () => {
      if (user && draft && draft.user_id === null) {
        const { error } = await supabase.from("drafts").update({ user_id: user.id }).eq("id", draft.id);
        if (!error) {
          localStorage.removeItem("pending_draft_id");
        }
      }
    };
    claimDraft();
  }, [user, draft]);

  const triggerLoginAlert = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (user) return;
    setShowLoginAlert(true);
  };

  const performLogin = () => {
    navigate(`/login?next=/result/${draftId}`);
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

  const handleContentUpdate = async (newContent: string) => {
    if (!selectedPlatform || !draft?.result_data) return;
    const platformKey = selectedPlatform === "reels" ? "reels_content" : `${selectedPlatform}_content`;
    const updatedResult = { ...draft.result_data, [platformKey]: newContent };
    setDraft((prev) => (prev ? { ...prev, result_data: updatedResult } : null));
    await supabase.from("drafts").update({ result_data: updatedResult }).eq("id", draftId);
  };

  const handleCardClick = (platformKey: string) => {
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
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell className="min-h-[700px]">
      <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">
        <h2 className="text-xl font-semibold text-foreground">오늘의 결과</h2>

        <div className="bg-[#F8F8F8] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">오늘 내가 기록한 내용</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => (user ? navigate("/input") : triggerLoginAlert(e))}
              className="h-8 text-xs"
            >
              {/* 로그인 상태에 따라 버튼 텍스트 변경 */}
              {user ? "수정하기" : "저장"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
            {draft?.input_data?.textInput || "음성 기록을 변환 중입니다..."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.keys(platformIcons).map((key) => {
            const meta = platformIcons[key as keyof typeof platformIcons];
            const Icon = meta.icon;
            const content = getContent(key);

            return (
              <button
                key={key}
                onClick={() => handleCardClick(key)}
                className="bg-[#F8F8F8] rounded-2xl p-4 hover:bg-[#F0F0F0] transition-all text-left space-y-2"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${key === "reels" ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : ""}`}
                  style={{ backgroundColor: key === "reels" ? undefined : meta.color }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-xs mb-1">{meta.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                    {getSummary(content)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 하단 버튼 디자인 통일 (검정색) */}
        <div className="pt-2 space-y-2 pb-24">
          {" "}
          {/* 하단 여백 확보 */}
          {!user ? (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-50 safe-area-bottom">
              <div className="max-w-md mx-auto">
                <Button
                  onClick={() => performLogin()}
                  className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-sm font-bold"
                >
                  3초 만에 로그인하고 결과 복사/저장하기
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                onClick={() => navigate("/input")}
                className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-sm"
              >
                새로운 기록 만들기
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full h-12 rounded-xl text-sm">
                홈으로 돌아가기
              </Button>
            </>
          )}
        </div>
      </div>

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
          isGuest={!user}
          isDraftMode={true}
          onSave={() => triggerLoginAlert()}
          onCopy={(content) => handleCopyAction(content)}
          onContentUpdate={handleContentUpdate}
        />
      )}
    </AppShell>
  );
};

export default DraftResult;
