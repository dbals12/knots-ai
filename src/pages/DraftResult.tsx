import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
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
  if (!content) return "콘텐츠 생성 중...";
  const cleanContent = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  return cleanContent.length > 80 ? cleanContent.substring(0, 80) + "..." : cleanContent;
};

const DraftResult = () => {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManualRefresh, setShowManualRefresh] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("AI가 기록을 분석하고 있어요...");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [editedInput, setEditedInput] = useState("");
  const [savingInput, setSavingInput] = useState(false);

  const isSessionType = new URLSearchParams(location.search).get("type") === "session";

  // 로딩 멘트 애니메이션
  useEffect(() => {
    if (!loading) return;
    const messages = [
      "AI가 기록을 분석하고 있어요...",
      "핵심 키워드를 추출하고 있습니다...",
      "4가지 플랫폼 콘텐츠를 생성하고 있어요...",
      "거의 다 되었습니다!",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const checkData = async () => {
    try {
      if (isSessionType) {
        // [로그인 유저] Sessions, Outputs 테이블 확인
        const { data: session } = await supabase.from("sessions").select("*").eq("id", draftId).single();
        const { data: outputs } = await supabase.from("outputs").select("*").eq("session_id", draftId);

        if (session) {
          const result_data: any = {};
          let outputCount = 0;

          if (outputs && outputs.length > 0) {
            outputs.forEach((o: any) => {
              if (o.generated_content) {
                outputCount++;
                if (o.platform_type === "blog") result_data.blog_content = o.generated_content;
                if (o.platform_type === "linkedin") result_data.linkedin_content = o.generated_content;
                if (o.platform_type === "reels") result_data.reels_content = o.generated_content;
                if (o.platform_type === "threads") result_data.threads_content = o.generated_content;
              }
            });
          }

          // 🔥 4개 콘텐츠가 다 만들어졌거나, 15초가 지나서 수동 새로고침이 활성화되었을 때만 보여주기
          if (outputCount >= 4 || (showManualRefresh && session.raw_text)) {
            setData({
              input_text: session.raw_text || "음성 변환 중...",
              input_mode: session.input_type,
              result_data,
            });
            setLoading(false);
            return true;
          }
        }
      } else {
        // [게스트] Drafts 테이블 확인
        const { data: draft } = await supabase.from("drafts").select("*").eq("id", draftId).single();
        if (draft) {
          const inputData = draft.input_data as any;
          const resultData = draft.result_data as any;

          if (draft.status === "completed" && resultData && Object.keys(resultData).length > 0) {
            setData({
              input_text: resultData?.transcript || inputData?.textInput || "변환 중...", // ✅ 여기만 변경
              input_mode: inputData?.inputMode,
              result_data: resultData || {},
            });
            setLoading(false);
            return true;
          }
          if (draft.status === "failed") {
            setLoadingMessage("생성에 실패했습니다. 다시 시도해주세요.");
            setShowManualRefresh(true);
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Check Error:", error);
      return false;
    }
  };

  useEffect(() => {
    if (!draftId) return;

    checkData();

    // 1초마다 데이터 확인 (Polling)
    pollingRef.current = setInterval(async () => {
      const allDone = await checkData();
      if (allDone && pollingRef.current) clearInterval(pollingRef.current);
    }, 1000);

    // 15초 지나면 수동 새로고침 버튼 띄우기 (무한로딩 방지)
    const timeoutId = setTimeout(() => setShowManualRefresh(true), 15000);

    const channel = supabase
      .channel(`any-${draftId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: isSessionType ? "outputs" : "drafts" }, () =>
        checkData(),
      )
      .subscribe();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [draftId, isSessionType]);

  const performLogin = () => {
    const nextUrl = `/result/${draftId}?type=draft`;
    navigate(`/login?next=${encodeURIComponent(nextUrl)}`);
  };

  const handleEditInput = () => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }
    // ✅ 결과창에서 바로 수정 모드로
    setEditedInput(data?.input_text || "");
    setIsEditingInput(true);
  };

  const handleCancelEdit = () => {
    setIsEditingInput(false);
    setEditedInput("");
  };

  const handleSaveEditedInput = async () => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }
    if (!draftId) return;

    const nextText = editedInput.trim();
    if (!nextText) {
      toast({ title: "내용이 비어있어요", description: "텍스트를 입력해주세요.", variant: "destructive" });
      return;
    }

    try {
      setSavingInput(true);

      if (isSessionType) {
        // session 모드면 sessions.raw_text 업데이트
        const { error } = await supabase.from("sessions").update({ raw_text: nextText }).eq("id", draftId);
        if (error) throw error;
      } else {
        // draft 모드면 drafts.input_data.textInput 업데이트
        const { data: draftRow, error: readErr } = await supabase
          .from("drafts")
          .select("input_data")
          .eq("id", draftId)
          .single();
        if (readErr) throw readErr;

        const nextInputData = { ...(draftRow?.input_data || {}), textInput: nextText };

        const { error: updateErr } = await supabase
          .from("drafts")
          .update({ input_data: nextInputData })
          .eq("id", draftId);

        if (updateErr) throw updateErr;
      }

      // ✅ 화면에도 즉시 반영
      setData((prev) => (prev ? { ...prev, input_text: nextText } : prev));
      setIsEditingInput(false);
      setEditedInput("");

      toast({ title: "저장 완료", description: "원문이 업데이트됐어요." });
      // ✅ 원문 저장 후 4개 콘텐츠 재생성 요청
      try {
        // draft 모드: drafts 테이블 기반 재생성
        if (!isSessionType) {
          // drafts를 다시 "processing"으로 바꿔서 polling이 다시 로딩/갱신하도록 유도
          await supabase.from("drafts").update({ status: "processing" }).eq("id", draftId);

          const fd = new FormData();
          fd.append("draft_id", draftId);
          fd.append("raw_text", nextText);
          // 필요하면 아래도 전달(너희 로직에 맞게)
          // fd.append("user_persona", "");
          // fd.append("user_mood", "");
          // fd.append("session_purpose", "");

          await supabase.functions.invoke("process-audio", { body: fd });
        } else {
          // session 모드: sessions/outputs 기반 재생성
          // outputs 기존값 삭제 후 다시 insert하는 방식이 가장 깔끔한데,
          // 지금은 간단히 “재생성 요청”만 하고 싶으면 세션용 payload로 호출
          const fd = new FormData();
          fd.append("session_id", draftId);
          fd.append("raw_text", nextText);

          await supabase.functions.invoke("process-audio", { body: fd });
        }

        toast({ title: "재생성 시작", description: "새 원문 기준으로 콘텐츠를 다시 만들고 있어요." });
        setLoading(true); // 결과 UI에서도 로딩 상태로 돌아가게 하고 싶다면(선택)
      } catch (e: any) {
        toast({ title: "재생성 실패", description: e.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    } finally {
      setSavingInput(false);
    }
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

  // ✅ [로딩 화면] 데이터가 준비되기 전에는 무조건 전체 화면 로딩
  if (loading || !data) {
    return (
      <AppShell showHeader={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 h-[100dvh] px-6 bg-white">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-100 border-t-black rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
          </div>

          <div className="text-center space-y-3">
            <p className="text-lg font-bold text-gray-900 animate-pulse">{loadingMessage}</p>
            <p className="text-sm text-gray-500">잠시만 기다려주세요 (약 10초 소요)</p>
          </div>

          {showManualRefresh && (
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="gap-2 rounded-full mt-4 border-gray-200 text-gray-600"
            >
              <RefreshCw className="w-4 h-4" /> 결과가 안 나오나요? 새로고침
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  // ✅ [결과 화면]
  return (
    <AppShell className="h-[100dvh] flex flex-col overflow-hidden bg-white">
      {/* 여백 제거 (pb-6) */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 pb-6">
        <h2 className="text-xl font-bold text-gray-900">오늘의 결과</h2>

        {/* 원본 카드 */}
        <div className="bg-[#F9F9F9] rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">오늘 내가 기록한 내용</h3>
            {/* 게스트도 '수정하기'로 버튼명 통일 */}
            {!isEditingInput ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditInput}
                className="h-8 text-xs bg-white border-gray-200"
              >
                수정하기
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8 text-xs bg-white border-gray-200"
                  disabled={savingInput}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEditedInput}
                  className="h-8 text-xs bg-black text-white hover:bg-gray-800"
                  disabled={savingInput || !editedInput.trim()}
                >
                  {savingInput ? "저장 중..." : "저장"}
                </Button>
              </div>
            )}
          </div>
          {/* 내용 전체 보기 (스크롤) */}
          {!isEditingInput ? (
            <div className="max-h-[200px] overflow-y-auto text-sm text-gray-600 leading-relaxed whitespace-pre-wrap scrollbar-hide">
              {data.input_text}
            </div>
          ) : (
            <textarea
              value={editedInput}
              onChange={(e) => setEditedInput(e.target.value)}
              className="w-full min-h-[160px] max-h-[240px] p-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          )}
        </div>

        {/* 결과 카드 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {Object.keys(platformIcons).map((key) => {
            const meta = platformIcons[key as keyof typeof platformIcons];
            const Icon = meta.icon;
            const content = getContent(key);

            return (
              <button
                key={key}
                onClick={() => handleCardClick(key)}
                className="bg-[#F9F9F9] rounded-2xl p-4 border border-gray-100 hover:bg-gray-100 transition-all text-left space-y-3 h-44 flex flex-col"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${key === "reels" ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : ""}`}
                  style={{ backgroundColor: key === "reels" ? undefined : meta.color }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 overflow-hidden w-full">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{meta.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{getSummary(content)}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 하단 버튼 (mt-auto 제거하여 바로 아래 붙음) */}
        <div className="flex flex-col gap-3 pt-2">
          {!user ? (
            <Button
              onClick={() => performLogin()}
              className="w-full h-14 rounded-xl bg-black text-white hover:bg-gray-800 text-base font-bold shadow-lg"
            >
              3초 만에 로그인하고 결과 저장하기
            </Button>
          ) : (
            <>
              <Button
                onClick={() => navigate("/input")}
                className="w-full h-14 rounded-xl bg-black text-white hover:bg-gray-800 font-bold text-base shadow-lg"
              >
                새로운 기록 만들기
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full h-14 rounded-xl font-bold text-base border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                홈으로 돌아가기
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showLoginAlert} onOpenChange={setShowLoginAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>로그인이 필요합니다</AlertDialogTitle>
            <AlertDialogDescription>결과를 저장하거나 복사하려면 로그인이 필요해요.</AlertDialogDescription>
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
        />
      )}
    </AppShell>
  );
};

export default DraftResult;
