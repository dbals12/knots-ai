import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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

interface ContentData {
  input_text: string;
  input_mode?: string;
  result_data: {
    blog_content?: string;
    linkedin_content?: string;
    reels_content?: string;
    threads_content?: string;
  };
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
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // ✅ AI 처리 상태 부활

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  const isSessionType = new URLSearchParams(location.search).get("type") === "session";

  // 1. 데이터 불러오기
  useEffect(() => {
    if (!draftId) return;

    const fetchData = async () => {
      try {
        if (isSessionType) {
          // 회원: sessions + outputs 조회
          const { data: session } = await supabase.from("sessions").select("*").eq("id", draftId).single();
          const { data: outputs } = await supabase.from("outputs").select("*").eq("session_id", draftId);

          if (session) {
            const result_data: any = {};
            outputs?.forEach((o: any) => {
              if (o.platform_type === "blog") result_data.blog_content = o.generated_content;
              if (o.platform_type === "linkedin") result_data.linkedin_content = o.generated_content;
              if (o.platform_type === "reels") result_data.reels_content = o.generated_content;
              if (o.platform_type === "threads") result_data.threads_content = o.generated_content;
            });
            setData({ input_text: session.raw_text, input_mode: session.input_type, result_data });
            setLoading(false);
          }
        } else {
          // 게스트: drafts 조회
          const { data: draft } = await supabase.from("drafts").select("*").eq("id", draftId).single();
          if (draft) {
            const inputData = draft.input_data as any;
            const resultData = draft.result_data as any;

            // ✅ 아직 AI 처리 전이면(idle) -> 로딩 유지하고 runAI 트리거 대기
            if (draft.status === "idle" || draft.status === "generating") {
              // 데이터는 세팅하되 로딩은 안 끔 (runAI가 처리함)
              setData({
                input_text: inputData?.textInput || "",
                input_mode: inputData?.inputMode,
                result_data: resultData || {},
              });
            } else {
              setData({
                input_text: inputData?.textInput || "",
                input_mode: inputData?.inputMode,
                result_data: resultData || {},
              });
              setLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    fetchData();
  }, [draftId, isSessionType]);

  // ✅ [복구] 게스트용 AI 실행기 (이게 없어서 녹음 변환이 안 됐던 것임)
  useEffect(() => {
    if (isSessionType || !data || isProcessing || !draftId) return;

    const runAI = async () => {
      // DB 상태 확인
      const { data: draft } = await supabase.from("drafts").select("status, input_data").eq("id", draftId).single();
      if (!draft || draft.status !== "idle") {
        if (draft?.status === "completed") setLoading(false);
        return;
      }

      setIsProcessing(true);
      try {
        await supabase.from("drafts").update({ status: "generating" }).eq("id", draftId);

        const inputData = draft.input_data as any;
        const formData = new FormData();
        formData.append("user_persona", inputData.selectedPersona);
        formData.append("user_mood", inputData.selectedMood);
        formData.append("session_purpose", inputData.sessionPurpose || "");

        if (inputData.inputMode === "voice" && inputData.audioBase64) {
          const res = await fetch(inputData.audioBase64);
          const blob = await res.blob();
          formData.append("audio", blob, "recording.webm");
        } else {
          formData.append("raw_text", inputData.textInput || "");
        }

        // Edge Function 호출
        const response = await fetch(`https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("AI Processing Failed");
        const aiResult = await response.json();

        // 결과 업데이트
        const updatedInputData = {
          ...inputData,
          textInput: aiResult.transcript || inputData.textInput,
        };

        const { error } = await supabase
          .from("drafts")
          .update({
            status: "completed",
            result_data: aiResult.content,
            input_data: updatedInputData,
          })
          .eq("id", draftId);

        if (error) throw error;

        // 화면 갱신
        setData({
          input_text: updatedInputData.textInput,
          input_mode: inputData.inputMode,
          result_data: aiResult.content,
        });
      } catch (error) {
        console.error("AI Error:", error);
        await supabase.from("drafts").update({ status: "failed", error_message: "생성 실패" }).eq("id", draftId);
        toast({ title: "오류", description: "AI 변환 중 문제가 발생했습니다.", variant: "destructive" });
      } finally {
        setIsProcessing(false);
        setLoading(false);
      }
    };

    runAI();
  }, [draftId, isSessionType, data, isProcessing, toast]); // 의존성 배열에 data 추가

  // ... (마이그레이션 로직 등 나머지는 기존과 동일) ...
  useEffect(() => {
    const migrateData = async () => {
      const pendingId = localStorage.getItem("pending_draft_id");
      if (user && pendingId && pendingId === draftId && !isSessionType) {
        setLoading(true);
        try {
          const { data: draft } = await supabase.from("drafts").select("*").eq("id", pendingId).single();
          if (draft) {
            const inputData = draft.input_data as any;
            const resultData = draft.result_data as any;

            const { data: session, error: sErr } = await supabase
              .from("sessions")
              .insert({
                user_id: user.id,
                raw_text: inputData.textInput,
                session_purpose: inputData.sessionPurpose,
                selected_mood: inputData.selectedMood,
                selected_persona: inputData.selectedPersona,
                keyword: inputData.keyword,
                entry_source: "web",
                input_type: inputData.inputMode,
              })
              .select()
              .single();

            if (sErr) throw sErr;

            const outputsToInsert = [];
            const rd = resultData || {};
            if (rd.blog_content)
              outputsToInsert.push({
                session_id: session.id,
                platform_type: "blog",
                generated_content: rd.blog_content,
              });
            if (rd.linkedin_content)
              outputsToInsert.push({
                session_id: session.id,
                platform_type: "linkedin",
                generated_content: rd.linkedin_content,
              });
            if (rd.reels_content)
              outputsToInsert.push({
                session_id: session.id,
                platform_type: "reels",
                generated_content: rd.reels_content,
              });
            if (rd.threads_content)
              outputsToInsert.push({
                session_id: session.id,
                platform_type: "threads",
                generated_content: rd.threads_content,
              });

            if (outputsToInsert.length > 0) {
              await supabase.from("outputs").insert(outputsToInsert);
            }

            await supabase.from("drafts").delete().eq("id", pendingId);
            localStorage.removeItem("pending_draft_id");
            navigate(`/result/${session.id}?type=session`, { replace: true });
          }
        } catch (e) {
          console.error("Migration failed", e);
          setLoading(false);
        }
      }
    };
    migrateData();
  }, [user, draftId, isSessionType]);

  const performLogin = () => {
    navigate(`/login?next=/result/${draftId}?type=draft`);
  };
  const handleEditInput = () => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }
    navigate("/input", { state: { initialText: data?.input_text } });
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
    if (!selectedPlatform || !data) return;
    const updatedResult = { ...data.result_data };
    if (selectedPlatform === "blog") updatedResult.blog_content = newContent;
    else if (selectedPlatform === "linkedin") updatedResult.linkedin_content = newContent;
    else if (selectedPlatform === "reels") updatedResult.reels_content = newContent;
    else if (selectedPlatform === "threads") updatedResult.threads_content = newContent;
    setData({ ...data, result_data: updatedResult });
    if (isSessionType && user) {
      await supabase
        .from("outputs")
        .update({ generated_content: newContent })
        .eq("session_id", draftId)
        .eq("platform_type", selectedPlatform);
    }
  };
  const handleCardClick = (platformKey: string) => {
    setSelectedPlatform(platformKey);
    setIsModalOpen(true);
  };
  const getContent = (key: string) => {
    if (!data?.result_data) return "";
    const rd = data.result_data;
    if (key === "blog") return rd.blog_content;
    if (key === "linkedin") return rd.linkedin_content;
    if (key === "reels") return rd.reels_content;
    if (key === "threads") return rd.threads_content;
    return "";
  };

  // ✅ [수정] 텍스트가 없으면(음성 변환 중) 무조건 로딩 화면 표시
  const isGenerating = loading || !data || (data.input_mode === "voice" && !data.input_text);

  if (isGenerating) {
    return (
      <AppShell showHeader={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-foreground" />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium text-foreground">AI가 변환 중입니다...</p>
            <p className="text-sm text-muted-foreground">음성을 텍스트로 바꾸고 있어요.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    // ✅ [수정] flex-col h-full로 전체 레이아웃 잡기
    <AppShell className="flex flex-col h-screen">
      <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">
        <h2 className="text-xl font-semibold text-foreground">오늘의 결과</h2>

        <div className="bg-[#F8F8F8] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">오늘 내가 기록한 내용</h3>
            <Button variant="outline" size="sm" onClick={handleEditInput} className="h-8 text-xs">
              {user ? "수정하기" : "저장"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
            {data.input_text}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
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
      </div>

      {/* ✅ [수정] AppShell 안쪽 하단에 버튼 배치 (흰색 배경은 유지하되 위치 고정 X) */}
      <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="max-w-md mx-auto">
          {!user ? (
            <Button
              onClick={() => performLogin()}
              className="w-full h-14 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-base font-bold shadow-lg"
            >
              3초 만에 로그인하고 결과 복사/저장하기
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/input")}
                className="flex-1 h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold"
              >
                새로운 기록 만들기
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="flex-1 h-12 rounded-xl font-bold">
                홈으로 돌아가기
              </Button>
            </div>
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
          isDraftMode={!isSessionType}
          onSave={() => (user ? null : setShowLoginAlert(true))}
          onCopy={(content) => handleCopyAction(content)}
          onContentUpdate={handleContentUpdate}
        />
      )}
    </AppShell>
  );
};

export default DraftResult;
