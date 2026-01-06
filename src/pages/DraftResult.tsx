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
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  const isSessionType = new URLSearchParams(location.search).get("type") === "session";

  // 데이터 폴링 로직
  const checkData = async () => {
    try {
      if (isSessionType) {
        // [로그인 유저] Sessions, Outputs 테이블 확인
        const { data: session } = await supabase.from("sessions").select("*").eq("id", draftId).single();
        const { data: outputs } = await supabase.from("outputs").select("*").eq("session_id", draftId);

        if (session) {
          const result_data: any = {};
          if (outputs && outputs.length > 0) {
            outputs.forEach((o: any) => {
              if (o.platform_type === "blog") result_data.blog_content = o.generated_content;
              if (o.platform_type === "linkedin") result_data.linkedin_content = o.generated_content;
              if (o.platform_type === "reels") result_data.reels_content = o.generated_content;
              if (o.platform_type === "threads") result_data.threads_content = o.generated_content;
            });
          }

          // 원본 텍스트가 있거나 결과가 하나라도 있으면 로딩 해제 (점진적 노출)
          if (session.raw_text || (outputs && outputs.length > 0)) {
            setData({
              input_text: session.raw_text || "음성 변환 중...",
              input_mode: session.input_type,
              result_data,
            });
            setLoading(false);
            if (Object.keys(result_data).length >= 4) return true;
            return false;
          }
        }
      } else {
        // [게스트] Drafts 테이블 확인
        const { data: draft } = await supabase.from("drafts").select("*").eq("id", draftId).single();
        if (draft) {
          const inputData = draft.input_data as any;
          const resultData = draft.result_data as any;

          setData({
            input_text: inputData?.textInput || "변환 중...",
            input_mode: inputData?.inputMode,
            result_data: resultData || {},
          });
          setLoading(false);

          if (draft.status === "completed" || (resultData && Object.keys(resultData).length > 0)) {
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
    pollingRef.current = setInterval(async () => {
      const allDone = await checkData();
      if (allDone && pollingRef.current) clearInterval(pollingRef.current);
    }, 1500);
    setTimeout(() => setShowManualRefresh(true), 5000);

    const channel = supabase
      .channel(`any-${draftId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: isSessionType ? "outputs" : "drafts" }, () =>
        checkData(),
      )
      .subscribe();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      supabase.removeChannel(channel);
    };
  }, [draftId, isSessionType]);

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

  if (loading || !data) {
    return (
      <AppShell showHeader={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 h-[100dvh] px-6">
          <Loader2 className="w-12 h-12 animate-spin text-black" />
          <div className="text-center space-y-2">
            <p className="text-xl font-bold">AI가 열심히 분석 중입니다...</p>
            <p className="text-sm text-gray-500">잠시만 기다려주세요.</p>
          </div>
          {showManualRefresh && (
            <Button onClick={() => window.location.reload()} variant="outline" className="gap-2 rounded-full mt-4">
              <RefreshCw className="w-4 h-4" /> 결과가 안 나오나요?
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell className="h-[100dvh] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-white pb-32">
        <h2 className="text-xl font-semibold">오늘의 결과</h2>

        {/* 원본 카드 */}
        <div className="bg-[#F8F8F8] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">오늘 내가 기록한 내용</h3>
            {/* 게스트도 '수정하기' 버튼 노출 (기능은 로그인 유도) */}
            <Button variant="outline" size="sm" onClick={handleEditInput} className="h-8 text-xs">
              수정하기
            </Button>
          </div>
          {/* 전체 내용 보기 (스크롤) */}
          <div className="max-h-[200px] overflow-y-auto text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {data.input_text || "내용을 불러오는 중입니다..."}
          </div>
        </div>

        {/* 결과 카드 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {Object.keys(platformIcons).map((key) => {
            const meta = platformIcons[key as keyof typeof platformIcons];
            const Icon = meta.icon;
            const content = getContent(key);
            const hasContent = content && content.length > 0;

            return (
              <button
                key={key}
                onClick={hasContent ? () => handleCardClick(key) : undefined}
                disabled={!hasContent}
                className="bg-[#F8F8F8] rounded-2xl p-4 hover:bg-[#F0F0F0] transition-all text-left space-y-2 relative h-40 flex flex-col"
              >
                {!hasContent && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 rounded-2xl z-10 backdrop-blur-[1px]">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-2" />
                    <span className="text-xs text-gray-400 font-medium">생성 중...</span>
                  </div>
                )}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${key === "reels" ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : ""}`}
                  style={{ backgroundColor: key === "reels" ? undefined : meta.color }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-medium text-black text-xs mb-1">{meta.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed font-normal">
                    {getSummary(content)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 버튼 영역 (여백 제거하고 바로 아래 붙임) */}
        <div className="flex flex-col gap-3 pt-2">
          {!user ? (
            <Button
              onClick={() => performLogin()}
              className="w-full h-14 rounded-xl bg-black text-white hover:bg-black/90 text-base font-bold shadow-lg"
            >
              3초 만에 로그인하고 결과 저장하기
            </Button>
          ) : (
            <>
              <Button
                onClick={() => navigate("/input")}
                className="w-full h-14 rounded-xl bg-black text-white hover:bg-black/90 font-bold text-base"
              >
                새로운 기록 만들기
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full h-14 rounded-xl font-bold text-base border-gray-200 hover:bg-gray-50"
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
