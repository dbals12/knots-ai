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

        // 텍스트 업데이트 및 결과 저장
        const updatedInputData = {
          ...draft.input_data,
          textInput: aiResult.transcript || draft.input_data.textInput,
        };

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

  // 3. Claim Logic (Login 후 자동 저장)
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

  // ✅ 로그인 유도 핸들러
  const handleLoginToSave = async () => {
    if (user) {
      toast({ title: "이미 저장되었습니다", description: "내 기록함에서 확인하세요." });
      return;
    }

    // 카카오 로그인 트리거 (redirectTo가 현재 페이지)
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/result/${draftId}` },
    });
  };

  // ✅ 복사 핸들러 (게스트는 로그인 유도, 회원은 복사 수행)
  const handleCopyAction = (content: string) => {
    if (!user) {
      handleLoginToSave();
      return;
    }
    // 여기에 실제 클립보드 복사 로직 (ResultDetailModal 내부에서 수행하지만, 상위 제어용)
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
      <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-foreground font-jost">오늘의 결과</h1>

        {/* 1. 입력 내용 요약 카드 (예전 UI 스타일 복원) */}
        {/* 흰색 박스 + 그림자 제거 + 연회색 배경 */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-2 text-foreground">오늘 내가 기록한 내용</h3>
            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
              {draft?.input_data?.textInput || "음성 기록을 변환 중입니다..."}
            </p>
          </div>
          {/* 게스트: 수정 불가(로그인 유도), 회원: 수정 가능(추후 구현) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoginToSave}
            className="text-xs h-8 ml-4 shrink-0 rounded-lg border-gray-200"
          >
            {user ? "수정하기" : "저장"}
          </Button>
        </div>

        {/* 2. 2x2 그리드 레이아웃 (예전 UI 스타일 복원) */}
        {draft?.result_data && (
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
                  // ✅ [디자인 복구] #F8F8F8 배경, 그림자 없음, hover시 진해짐
                  className="bg-[#F8F8F8] rounded-2xl p-5 text-left hover:bg-[#F0F0F0] transition-colors flex flex-col h-52 relative overflow-hidden group"
                >
                  <div className="flex items-center gap-2 mb-4">
                    {/* 아이콘 배경 스타일 유지 */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${isInstagram ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : "bg-white"}`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isInstagram ? "text-white" : "text-foreground"}`}
                        style={{ color: isInstagram ? undefined : meta.color }}
                      />
                    </div>
                  </div>
                  {/* 폰트 스타일 복구 */}
                  <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-1">{meta.label}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{preview}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. 하단 버튼 (고정 아님, 스크롤 최하단 배치 - 예전 스타일) */}
        <div className="pt-4 pb-10 space-y-3">
          {!user ? (
            // 게스트용 버튼
            <Button
              onClick={handleLoginToSave}
              className="w-full h-14 rounded-2xl text-base font-bold bg-foreground text-background hover:bg-foreground/90 shadow-none"
            >
              로그인하고 텍스트 복사/수정하기
            </Button>
          ) : (
            // 로그인 유저용 버튼
            <>
              <Button
                onClick={() => navigate("/input")}
                className="w-full h-14 rounded-2xl text-base font-bold bg-foreground text-background hover:bg-foreground/90 shadow-none"
              >
                새로운 기록 만들기
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="w-full text-muted-foreground text-sm hover:bg-transparent hover:text-foreground"
              >
                홈으로 돌아가기
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 4. 상세 모달 (로직 분리 적용) */}
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
          // ✅ [핵심] 로그인 여부에 따라 다른 동작 수행
          onSave={() => handleLoginToSave()}
          onCopy={(content) => handleCopyAction(content)}
          onContentUpdate={() => {}}
        />
      )}
    </AppShell>
  );
};

export default DraftResult;
