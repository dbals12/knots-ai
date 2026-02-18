import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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
import {
  trackPageView_Event,
  trackResultView,
  trackOpenPlatformModal,
  trackClickNewRecord,
  trackClickGoHome,
  trackLoginStart,
} from "@/lib/analytics";

// ─── 접힘/펼침 가능한 원문 카드 (DraftResult용) ───
interface DraftInputCardProps {
  inputText: string;
  isEditing: boolean;
  editedInput: string;
  savingInput: boolean;
  onEditClick: () => void;
  onCancel: () => void;
  onSave: () => void;
  onEditedInputChange: (v: string) => void;
}

const DraftInputCard = ({
  inputText, isEditing, editedInput, savingInput,
  onEditClick, onCancel, onSave, onEditedInputChange,
}: DraftInputCardProps) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-muted/40 rounded-2xl p-3 md:p-5 border border-border/50">
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h3 className="font-bold text-foreground text-sm md:text-base">오늘 내가 기록한 내용</h3>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={onEditClick} className="h-7 md:h-8 text-xs">수정하기</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-7 md:h-8 text-xs" disabled={savingInput}>취소</Button>
            <Button size="sm" onClick={onSave} className="h-7 md:h-8 text-xs bg-foreground text-background hover:bg-foreground/90" disabled={savingInput || !editedInput.trim()}>
              {savingInput ? "저장 중..." : "저장"}
            </Button>
          </div>
        )}
      </div>
      {!isEditing ? (
        <div>
          <div className={`text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap overflow-hidden ${expanded ? "" : "line-clamp-3 md:line-clamp-4"}`}>
            {inputText}
          </div>
          {inputText && inputText.length > 120 && (
            <button onClick={() => setExpanded(!expanded)} className="mt-1.5 flex items-center gap-0.5 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors">
              {expanded ? <><ChevronUp className="w-3 h-3" /> 접기</> : <><ChevronDown className="w-3 h-3" /> 더보기</>}
            </button>
          )}
        </div>
      ) : (
        <textarea value={editedInput} onChange={(e) => onEditedInputChange(e.target.value)}
          className="w-full min-h-[140px] md:min-h-[160px] max-h-[240px] p-3 rounded-xl border border-border bg-background text-xs md:text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20" />
      )}
    </div>
  );
};

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
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("AI가 기록을 분석하고 있어요...");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const loadingStartRef = useRef<number>(Date.now());

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [editedInput, setEditedInput] = useState("");
  const [savingInput, setSavingInput] = useState(false);

  // ✅ URL에서 type 파라미터 확인
  const isSessionType = new URLSearchParams(location.search).get("type") === "session";
  const [promotionAttempted, setPromotionAttempted] = useState(false);

  // ✅ [세이프가드] 로그인 유저가 draft 페이지에 있으면 자동 승격 시도
  useEffect(() => {
    const attemptAutoPromotion = async () => {
      // 이미 session 타입이거나, 유저가 없거나, 이미 시도했으면 스킵
      if (isSessionType || !user || promotionAttempted || !draftId) return;

      setPromotionAttempted(true);

      try {
        // 먼저 draft의 session_id 확인 (이미 승격되었는지)
        const { data: draft } = await supabase
          .from("drafts")
          .select("session_id, status")
          .eq("id", draftId)
          .single();

        // 이미 승격된 경우 바로 세션 페이지로 이동
        if (draft?.session_id) {
          navigate(`/result/${draft.session_id}?type=session`, { replace: true });
          return;
        }

        // 아직 완료되지 않은 draft면 승격하지 않음
        if (draft?.status !== "completed") {
          return;
        }

        // ✅ 승격 시도
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          return;
        }

        const { data, error } = await supabase.functions.invoke("promote-draft", {
          body: { draft_id: draftId },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!error && data?.session_id) {
          localStorage.removeItem("pending_draft_id");
          navigate(`/result/${data.session_id}?type=session`, { replace: true });
        }
      } catch (e) {
        console.error("[DraftResult] Auto-promotion failed:", e);
      }
    };

    attemptAutoPromotion();
  }, [user, isSessionType, draftId, promotionAttempted, navigate]);

  // ✅ Track page_view and result_view
  useEffect(() => {
    const params = isSessionType ? { session_id: draftId } : { draft_id: draftId };
    trackPageView_Event("result", params);
    trackResultView(params);
  }, [draftId, isSessionType]);

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

  // ✅ 게스트 재시도: draft 기반 process-audio 호출
  const handleRetry = async () => {
    if (!draftId || isRetrying) return;

    setIsRetrying(true);
    setShowRetryButton(false);
    setLoadingMessage("재시도 중...");
    loadingStartRef.current = Date.now();

    try {
      // 먼저 draft의 input_data를 가져옴
      const { data: draft, error: fetchError } = await supabase
        .from("drafts")
        .select("input_data")
        .eq("id", draftId)
        .single();

      if (fetchError || !draft) {
        throw new Error("Draft를 찾을 수 없습니다.");
      }

      const inputData = draft.input_data as Record<string, unknown>;

      // status를 processing으로 업데이트
      await supabase
        .from("drafts")
        .update({ status: "processing", error_message: null })
        .eq("id", draftId);

      // FormData 구성
      const fd = new FormData();
      fd.append("draft_id", draftId);
      fd.append("user_persona", (inputData?.selectedPersona as string) || "");
      fd.append("user_mood", (inputData?.selectedMood as string) || "");
      fd.append("session_purpose", (inputData?.sessionPurpose as string) || "");
      fd.append("input_type", (inputData?.inputMode as string) || "text");
      fd.append("keyword", (inputData?.keyword as string) || "");

      // 텍스트 또는 오디오 추가
      const textInput = inputData?.textInput as string;
      const audioBase64 = inputData?.audioBase64 as string;

      if (textInput) {
        fd.append("raw_text", textInput);
      } else if (audioBase64) {
        // base64를 Blob으로 변환
        const byteString = atob(audioBase64.split(",")[1] || audioBase64);
        const mimeString = audioBase64.split(",")[0]?.split(":")[1]?.split(";")[0] || "audio/webm";
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        fd.append("audio", blob, "recording.webm");
      } else {
        throw new Error("입력 데이터가 없습니다.");
      }

      // ✅ 게스트: Authorization 없이 fetch 호출
      fetch("https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio", {
        method: "POST",
        body: fd,
      }).catch(console.error);

      toast({ title: "재시도 시작", description: "콘텐츠를 다시 생성하고 있어요." });
    } catch (error: any) {
      console.error("Retry error:", error);
      toast({ title: "재시도 실패", description: error.message, variant: "destructive" });
      setShowRetryButton(true);
    } finally {
      setIsRetrying(false);
    }
  };

  const checkData = async () => {
    try {
      if (isSessionType) {
        // ✅ [세션 모드] sessions + outputs 테이블 조회
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

          // 4개 콘텐츠가 다 만들어졌거나, 15초 지나서 재시도 버튼 활성화 시
          if (outputCount >= 4 || (showRetryButton && session.raw_text)) {
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
        // ✅ [드래프트 모드] drafts 테이블 조회
        const { data: draft } = await supabase.from("drafts").select("*").eq("id", draftId).single();
        if (draft) {
          const inputData = draft.input_data as any;
          const resultData = draft.result_data as any;

          if (draft.status === "completed" && resultData && Object.keys(resultData).length > 0) {
            setData({
              input_text: resultData?.transcript || inputData?.textInput || "변환 중...",
              input_mode: inputData?.inputMode,
              result_data: resultData || {},
            });
            setLoading(false);
            return true;
          }
          if (draft.status === "failed") {
            setLoadingMessage("생성에 실패했습니다. 다시 시도해주세요.");
            setShowRetryButton(true);
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

    loadingStartRef.current = Date.now();
    checkData();

    // 1초마다 데이터 확인 (Polling) + 15초 타임아웃 체크
    pollingRef.current = setInterval(async () => {
      const allDone = await checkData();
      if (allDone && pollingRef.current) {
        clearInterval(pollingRef.current);
        return;
      }

      // 15초 이상 idle 또는 processing 상태면 재시도 버튼 표시
      const elapsed = Date.now() - loadingStartRef.current;
      if (elapsed >= 15000 && !showRetryButton) {
        setShowRetryButton(true);
      }
    }, 1000);

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
    const nextUrl = `/result/${draftId}?type=draft`;
    navigate(`/login?next=${encodeURIComponent(nextUrl)}`);
  };

  // ✅ 수정 버튼 클릭: 로그인 유저만 허용
  const handleEditInputClick = () => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }
    setEditedInput(data?.input_text || "");
    setIsEditingInput(true);
  };

  const handleCancelEdit = () => {
    setIsEditingInput(false);
    setEditedInput("");
  };

  // ✅ 저장: 세션 기반으로만 동작 (regenerate-session 호출)
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
      setIsRegenerating(true);
      setLoadingMessage("재생성 중...");
      setIsEditingInput(false);
      setEditedInput("");

      // ✅ 세션 토큰 가져오기
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        toast({ title: "로그인이 필요합니다", description: "다시 로그인해 주세요.", variant: "destructive" });
        setIsRegenerating(false);
        setSavingInput(false);
        return;
      }

      // ✅ 세션 모드가 아니면 먼저 승격 필요
      let targetSessionId = draftId;
      if (!isSessionType) {
        const { data: promoteResult, error: promoteError } = await supabase.functions.invoke("promote-draft", {
          body: { draft_id: draftId },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (promoteError || !promoteResult?.session_id) {
          throw new Error("세션 생성에 실패했습니다.");
        }
        targetSessionId = promoteResult.session_id;
      }

      toast({ title: "재생성 시작", description: "새 원문 기준으로 콘텐츠를 다시 만들고 있어요." });

      // ✅ regenerate-session 호출 (세션 기반으로만 동작)
      const { data: result, error: regenerateError } = await supabase.functions.invoke("regenerate-session", {
        body: { session_id: targetSessionId, raw_text: nextText },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (regenerateError || !result?.success) {
        throw new Error(result?.error || "재생성에 실패했습니다.");
      }

      // ✅ 세션 URL로 이동 (draft에서 session으로 승격된 경우)
      if (targetSessionId !== draftId) {
        navigate(`/result/${targetSessionId}?type=session`, { replace: true });
      }

      // ✅ 화면에 새 콘텐츠 즉시 반영
      if (result.outputs) {
        setData({
          input_text: nextText,
          input_mode: data?.input_mode,
          result_data: {
            blog_content: result.outputs.blog_content,
            linkedin_content: result.outputs.linkedin_content,
            reels_content: result.outputs.reels_content,
            threads_content: result.outputs.threads_content,
          },
        });
      }

      toast({ title: "재생성 완료", description: "콘텐츠가 새로 생성되었어요." });
    } catch (e: any) {
      console.error("Regeneration error:", e);
      toast({ title: "재생성 실패", description: e.message, variant: "destructive" });
    } finally {
      setSavingInput(false);
      setIsRegenerating(false);
      setLoading(false);
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
    const params = isSessionType ? { session_id: draftId } : { draft_id: draftId };
    trackOpenPlatformModal(platformKey, params);
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

  // ✅ [로딩 화면]
  if (loading || !data || isRegenerating) {
    return (
      <AppShell showHeader={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 h-[100dvh] px-6 bg-background">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-muted border-t-foreground rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
          </div>

          <div className="text-center space-y-3">
            <p className="text-lg font-bold text-foreground animate-pulse">{loadingMessage}</p>
            <p className="text-sm text-muted-foreground">잠시만 기다려주세요 (약 10초 소요)</p>
          </div>

          {showRetryButton && !isRegenerating && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="outline"
              className="gap-2 rounded-full mt-4 border-border text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "재시도 중..." : "결과가 안 나오나요? 재시도"}
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  // ✅ [결과 화면]
  return (
    <AppShell className="h-[100dvh] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 md:py-6 space-y-4 md:space-y-5 pb-6">
        <h2 className="text-lg md:text-xl font-bold text-foreground">오늘의 결과</h2>

        {/* 원본 카드 - 모바일 접힘/펼침 */}
        <DraftInputCard
          inputText={data.input_text}
          isEditing={isEditingInput}
          editedInput={editedInput}
          savingInput={savingInput}
          onEditClick={handleEditInputClick}
          onCancel={handleCancelEdit}
          onSave={handleSaveEditedInput}
          onEditedInputChange={setEditedInput}
        />

        {/* 반응형 그리드: 모바일 1열 / md 이상 2열 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {Object.keys(platformIcons).map((key) => {
            const meta = platformIcons[key as keyof typeof platformIcons];
            const Icon = meta.icon;
            const content = getContent(key);

            return (
              <button
                key={key}
                onClick={() => handleCardClick(key)}
                className="bg-muted/40 rounded-2xl p-3 md:p-4 border border-border/50 hover:bg-muted/60 transition-all text-left space-y-2 md:space-y-3 flex flex-col"
              >
                <div
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${key === "reels" ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : ""}`}
                  style={{ backgroundColor: key === "reels" ? undefined : meta.color }}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="flex-1 overflow-hidden w-full">
                  <h3 className="font-bold text-foreground text-xs md:text-sm mb-1">{meta.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3">{getSummary(content)}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 하단 버튼 */}
        <div className="flex flex-col gap-2 md:gap-3 pt-1">
          {!user ? (
            <Button
              onClick={() => performLogin()}
              className="w-full h-11 md:h-14 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-sm md:text-base font-bold shadow-lg"
            >
              3초 만에 로그인하고 결과 저장하기
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  const params = isSessionType ? { session_id: draftId } : { draft_id: draftId };
                  trackClickNewRecord(params);
                  navigate("/input");
                }}
                className="w-full h-11 md:h-14 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold text-sm md:text-base shadow-lg"
              >
                새로운 기록 만들기
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const params = isSessionType ? { session_id: draftId } : { draft_id: draftId };
                  trackClickGoHome(params);
                  navigate("/");
                }}
                className="w-full h-11 md:h-14 rounded-xl font-bold text-sm md:text-base"
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
