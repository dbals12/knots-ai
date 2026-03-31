import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronDown, ChevronUp, Lock, Pencil, ArrowRight, Lightbulb } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import ResultDetailModal from "@/components/ResultDetailModal";
import GlassOrb from "@/components/GlassOrb";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import track from "@/lib/track";
import { getSessionId } from "@/lib/session";

// ─── Collapsible input card ───
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
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-foreground">기록한 내용</h3>
        {!isEditing ? (
          <button onClick={onEditClick} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-full bg-muted/50">
            수정하기
          </button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs rounded-lg" disabled={savingInput}>취소</Button>
            <Button size="sm" onClick={onSave} className="h-7 text-xs rounded-lg bg-foreground text-background hover:bg-foreground/90" disabled={savingInput || !editedInput.trim()}>
              {savingInput ? "저장 중..." : "저장"}
            </Button>
          </div>
        )}
      </div>
      {!isEditing ? (
        <div>
          <div className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap overflow-hidden ${expanded ? "" : "line-clamp-2"}`}>
            {inputText}
          </div>
          {inputText && inputText.length > 80 && (
            <button onClick={() => setExpanded(!expanded)} className="mt-1 flex items-center gap-0.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              {expanded ? <><ChevronUp className="w-3 h-3" /> 접기</> : <><ChevronDown className="w-3 h-3" /> 더보기</>}
            </button>
          )}
        </div>
      ) : (
        <textarea value={editedInput} onChange={(e) => onEditedInputChange(e.target.value)}
          className="w-full min-h-[100px] max-h-[180px] p-3 rounded-xl border border-border/40 bg-muted/30 text-xs text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20" />
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
  blog: { icon: SiNaver, color: "#03C75A", title: "Blog" },
  linkedin: { icon: SiLinkedin, color: "#0077B5", title: "Linkedin" },
  reels: { icon: SiInstagram, color: "#E4405F", title: "Instagram" },
  threads: { icon: SiThreads, color: "#000000", title: "Threads" },
};

const getSummary = (content: string | null, maxLen = 60) => {
  if (!content) return "콘텐츠 생성 중...";
  const clean = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  return clean.length > maxLen ? clean.substring(0, maxLen) + "..." : clean;
};

const countInsights = (rd: ContentData["result_data"]): number => {
  return [rd.blog_content, rd.linkedin_content, rd.reels_content, rd.threads_content].filter(Boolean).length;
};

const getInsightSummary = (rd: ContentData["result_data"]): string => {
  const source = rd.blog_content || rd.linkedin_content || "";
  if (!source) return "";
  const clean = source.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").replace(/^#+\s.*/gm, "").trim();
  const sentences = clean.split(/[.!?。]\s/).filter(Boolean).slice(0, 2);
  return sentences.join(". ").substring(0, 160) + (sentences.length > 0 ? "." : "");
};

const getAdditionalInsights = (rd: ContentData["result_data"]): string[] => {
  const sources = [rd.linkedin_content, rd.blog_content, rd.threads_content].filter(Boolean);
  const insights: string[] = [];
  for (const src of sources) {
    if (!src) continue;
    const clean = src.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").replace(/^#+\s.*/gm, "").trim();
    const sentences = clean.split(/[.!?。]\s/).filter(s => s.length > 15);
    for (const s of sentences) {
      if (insights.length >= 3) break;
      const trimmed = s.trim().substring(0, 80);
      if (!insights.some(existing => existing.startsWith(trimmed.substring(0, 20)))) {
        insights.push(trimmed + (s.length > 80 ? "..." : "."));
      }
    }
    if (insights.length >= 3) break;
  }
  return insights.length > 0 ? insights : ["핵심 패턴을 분석하고 있습니다.", "감정 반응 패턴을 확인합니다.", "성장 인사이트를 도출합니다."];
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingStartRef = useRef<number>(Date.now());

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [editedInput, setEditedInput] = useState("");
  const [savingInput, setSavingInput] = useState(false);

  const isSessionType = new URLSearchParams(location.search).get("type") === "session";
  const [promotionAttempted, setPromotionAttempted] = useState(false);

  // ── Auto-promotion (unchanged) ──
  useEffect(() => {
    const attemptAutoPromotion = async () => {
      if (isSessionType || !user || promotionAttempted || !draftId) return;
      setPromotionAttempted(true);
      try {
        const { data: draft } = await supabase.from("drafts").select("session_id, status").eq("id", draftId).single();
        if (draft?.session_id) { navigate(`/result/${draft.session_id}?type=session`, { replace: true }); return; }
        if (draft?.status !== "completed") return;
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;
        const { data: promoteData, error } = await supabase.functions.invoke("promote-draft", {
          body: { draft_id: draftId }, headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!error && promoteData?.session_id) {
          localStorage.removeItem("pending_draft_id");
          navigate(`/result/${promoteData.session_id}?type=session`, { replace: true });
        }
      } catch (e) { console.error("[DraftResult] Auto-promotion failed:", e); }
    };
    attemptAutoPromotion();
  }, [user, isSessionType, draftId, promotionAttempted, navigate]);

  // ── Track view_result (unchanged) ──
  useEffect(() => {
    const analyticsSessionId = getSessionId();
    const idProps = isSessionType
      ? { db_session_id: draftId, analytics_session_id: analyticsSessionId }
      : { draft_id: draftId, analytics_session_id: analyticsSessionId };
    track.pageView("result", idProps);
    track.viewResult(idProps);
  }, [draftId, isSessionType]);

  // ── Loading messages (unchanged) ──
  useEffect(() => {
    if (!loading) return;
    const messages = ["AI가 기록을 분석하고 있어요...", "핵심 키워드를 추출하고 있습니다...", "4가지 플랫폼 콘텐츠를 생성하고 있어요...", "거의 다 되었습니다!"];
    let i = 0;
    const interval = setInterval(() => { i = (i + 1) % messages.length; setLoadingMessage(messages[i]); }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  // ── Guest retry (unchanged) ──
  const handleRetry = async () => {
    if (!draftId || isRetrying) return;
    setIsRetrying(true); setShowRetryButton(false); setLoadingMessage("재시도 중...");
    loadingStartRef.current = Date.now();
    try {
      const { data: draft, error: fetchError } = await supabase.from("drafts").select("input_data").eq("id", draftId).single();
      if (fetchError || !draft) throw new Error("Draft를 찾을 수 없습니다.");
      const inputData = draft.input_data as Record<string, unknown>;
      await supabase.from("drafts").update({ status: "processing", error_message: null }).eq("id", draftId);
      const fd = new FormData();
      fd.append("draft_id", draftId);
      fd.append("user_persona", (inputData?.selectedPersona as string) || "");
      fd.append("user_mood", (inputData?.selectedMood as string) || "");
      fd.append("session_purpose", (inputData?.sessionPurpose as string) || "");
      fd.append("input_type", (inputData?.inputMode as string) || "text");
      fd.append("keyword", (inputData?.keyword as string) || "");
      const textInput = inputData?.textInput as string;
      const audioBase64 = inputData?.audioBase64 as string;
      if (textInput) { fd.append("raw_text", textInput); }
      else if (audioBase64) {
        const byteString = atob(audioBase64.split(",")[1] || audioBase64);
        const mimeString = audioBase64.split(",")[0]?.split(":")[1]?.split(";")[0] || "audio/webm";
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        fd.append("audio", new Blob([ab], { type: mimeString }), "recording.webm");
      } else { throw new Error("입력 데이터가 없습니다."); }
      fetch("https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio", { method: "POST", body: fd }).catch(console.error);
      toast({ title: "재시도 시작", description: "콘텐츠를 다시 생성하고 있어요." });
    } catch (error: any) {
      console.error("Retry error:", error);
      toast({ title: "재시도 실패", description: error.message, variant: "destructive" });
      setShowRetryButton(true);
    } finally { setIsRetrying(false); }
  };

  // ── Data polling (unchanged) ──
  const checkData = async () => {
    try {
      if (isSessionType) {
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
          if (outputCount >= 4 || (showRetryButton && session.raw_text)) {
            setData({ input_text: session.raw_text || "음성 변환 중...", input_mode: session.input_type, result_data });
            setLoading(false); return true;
          }
        }
      } else {
        const { data: draft } = await supabase.from("drafts").select("*").eq("id", draftId).single();
        if (draft) {
          const inputData = draft.input_data as any;
          const resultData = draft.result_data as any;
          if (draft.status === "completed" && resultData && Object.keys(resultData).length > 0) {
            setData({ input_text: resultData?.transcript || inputData?.textInput || "변환 중...", input_mode: inputData?.inputMode, result_data: resultData || {} });
            setLoading(false); return true;
          }
          if (draft.status === "failed") { setLoadingMessage("생성에 실패했습니다. 다시 시도해주세요."); setShowRetryButton(true); return true; }
        }
      }
      return false;
    } catch (error) { console.error("Check Error:", error); return false; }
  };

  useEffect(() => {
    if (!draftId) return;
    loadingStartRef.current = Date.now();
    checkData();
    pollingRef.current = setInterval(async () => {
      const allDone = await checkData();
      if (allDone && pollingRef.current) { clearInterval(pollingRef.current); return; }
      const elapsed = Date.now() - loadingStartRef.current;
      if (elapsed >= 15000 && !showRetryButton) setShowRetryButton(true);
    }, 1000);
    const channel = supabase
      .channel(`any-${draftId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: isSessionType ? "outputs" : "drafts" }, () => checkData())
      .subscribe();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); supabase.removeChannel(channel); };
  }, [draftId, isSessionType]);

  const performLogin = () => {
    const nextUrl = `/result/${draftId}?type=draft`;
    navigate(`/login?next=${encodeURIComponent(nextUrl)}`);
  };

  const handleEditInputClick = () => {
    if (!user) { setShowLoginAlert(true); return; }
    setEditedInput(data?.input_text || ""); setIsEditingInput(true);
  };

  const handleCancelEdit = () => { setIsEditingInput(false); setEditedInput(""); };

  const handleSaveEditedInput = async () => {
    if (!user) { setShowLoginAlert(true); return; }
    if (!draftId) return;
    const nextText = editedInput.trim();
    if (!nextText) { toast({ title: "내용이 비어있어요", description: "텍스트를 입력해주세요.", variant: "destructive" }); return; }
    try {
      setSavingInput(true); setIsRegenerating(true); setLoadingMessage("재생성 중...");
      setIsEditingInput(false); setEditedInput("");
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { toast({ title: "로그인이 필요합니다", variant: "destructive" }); setIsRegenerating(false); setSavingInput(false); return; }
      let targetSessionId = draftId;
      if (!isSessionType) {
        const { data: promoteResult, error: promoteError } = await supabase.functions.invoke("promote-draft", {
          body: { draft_id: draftId }, headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (promoteError || !promoteResult?.session_id) throw new Error("세션 생성에 실패했습니다.");
        targetSessionId = promoteResult.session_id;
      }
      toast({ title: "재생성 시작", description: "새 원문 기준으로 콘텐츠를 다시 만들고 있어요." });
      const { data: result, error: regenerateError } = await supabase.functions.invoke("regenerate-session", {
        body: { session_id: targetSessionId, raw_text: nextText },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (regenerateError || !result?.success) throw new Error(result?.error || "재생성에 실패했습니다.");
      if (targetSessionId !== draftId) navigate(`/result/${targetSessionId}?type=session`, { replace: true });
      if (result.outputs) {
        setData({
          input_text: nextText, input_mode: data?.input_mode,
          result_data: { blog_content: result.outputs.blog_content, linkedin_content: result.outputs.linkedin_content, reels_content: result.outputs.reels_content, threads_content: result.outputs.threads_content },
        });
      }
      toast({ title: "재생성 완료", description: "콘텐츠가 새로 생성되었어요." });
    } catch (e: any) {
      console.error("Regeneration error:", e);
      toast({ title: "재생성 실패", description: e.message, variant: "destructive" });
    } finally { setSavingInput(false); setIsRegenerating(false); setLoading(false); }
  };

  const handleCopyAction = (content: string) => {
    if (!user) { setShowLoginAlert(true); return; }
    navigator.clipboard.writeText(content).then(() => { toast({ title: "복사 완료", description: "클립보드에 복사되었습니다." }); });
  };

  const handleCardClick = (platformKey: string) => {
    if (!user) { setShowLoginAlert(true); return; }
    const idProps = isSessionType ? { session_id: draftId } : { draft_id: draftId };
    track.pageView("platform_modal", { platform_type: platformKey, ...idProps });
    setSelectedPlatform(platformKey); setIsModalOpen(true);
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

  // ── Loading screen ──
  if (loading || !data || isRegenerating) {
    return (
      <AppShell showHeader={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 h-[100dvh] px-6">
          <GlassOrb state="recording" size="w-28 h-28" />
          <div className="text-center space-y-3">
            <p className="text-base font-medium text-foreground animate-pulse">{loadingMessage}</p>
            <p className="text-xs text-muted-foreground">잠시만 기다려주세요 (약 10초 소요)</p>
          </div>
          {showRetryButton && !isRegenerating && (
            <Button onClick={handleRetry} disabled={isRetrying} variant="outline" className="gap-2 rounded-full mt-4 border-border text-muted-foreground">
              <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "재시도 중..." : "결과가 안 나오나요? 재시도"}
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  const insightCount = countInsights(data.result_data);
  const insightSummary = getInsightSummary(data.result_data);
  const additionalInsights = getAdditionalInsights(data.result_data);
  const isGuest = !user;
  const platformOrder = ["blog", "linkedin", "reels", "threads"] as const;

  return (
    <AppShell>
      <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto pb-40">
        {/* ── Header text ── */}
        <div className="pt-1">
          <p className="text-sm text-foreground leading-relaxed">
            AI가 분석해 <span className="font-semibold">{insightCount}개</span>의 인사이트를 정리했어요
          </p>
        </div>

        {/* ── 기록한 내용 ── */}
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

        {/* ── 핵심 포인트 (Core Insight) ── */}
        {insightSummary && (
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">✨</span>
              <h3 className="text-sm font-semibold text-foreground">핵심 포인트</h3>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </div>
            <p className="text-base font-medium text-foreground leading-relaxed">
              "{insightSummary}"
            </p>
          </div>
        )}

        {/* ── 추가 인사이트 ── */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">추가 인사이트</h3>
          <div className="space-y-2">
            {additionalInsights.map((insight, idx) => (
              <div
                key={idx}
                className={`glass-card px-4 py-3 flex items-start gap-3 ${isGuest && idx > 0 ? "relative overflow-hidden" : ""}`}
              >
                <Lightbulb className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className={`text-xs text-muted-foreground leading-relaxed ${isGuest && idx > 0 ? "blur-[3px] select-none" : ""}`}>
                  {insight}
                </p>
                {isGuest && idx > 0 && (
                  <Lock className="w-3 h-3 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 콘텐츠로 변환 ── */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">콘텐츠로 변환</h3>
          <div className="grid grid-cols-2 gap-3">
            {platformOrder.map((key, idx) => {
              const meta = platformIcons[key];
              const Icon = meta.icon;
              const content = getContent(key) || "";
              const isPreview = isGuest ? idx === 0 : true;

              return (
                <button
                  key={key}
                  onClick={() => handleCardClick(key)}
                  className="glass-card p-4 text-left space-y-2 relative overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${key === "reels" ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : ""}`}
                      style={{ backgroundColor: key === "reels" ? undefined : meta.color }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{meta.title}</span>
                    {!isPreview && <Lock className="w-3 h-3 text-muted-foreground/40 ml-auto" />}
                  </div>
                  {isPreview ? (
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {getSummary(content, 50)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground leading-relaxed blur-[3px] select-none line-clamp-2" aria-hidden>
                      {getSummary(content, 40)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Floating CTA (guest) or action buttons (logged in) ── */}
      {isGuest ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[392px] bg-background rounded-[20px] shadow-[0_8px_24px_hsla(0,0%,0%,0.08)] p-5 space-y-3 z-20 border border-border/30">
          <p className="text-sm font-semibold text-foreground">AI 분석 전체 확인하기</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            로그인하면 모든 인사이트와 콘텐츠 생성 기능을 사용할 수 있습니다.
          </p>
          <button
            onClick={performLogin}
            className="w-full h-12 btn-steel text-sm flex items-center justify-center gap-2"
          >
            로그인하기 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="px-6 pb-6 pt-2 space-y-2">
          <button
            onClick={() => {
              const idProps = isSessionType ? { session_id: draftId } : { draft_id: draftId };
              track.pageView("new_record_click", idProps);
              navigate("/input");
            }}
            className="w-full h-12 btn-steel text-sm"
          >
            새로운 기록 만들기
          </button>
          <Button
            variant="outline"
            onClick={() => {
              const idProps = isSessionType ? { session_id: draftId } : { draft_id: draftId };
              track.pageView("go_home_click", idProps);
              navigate("/");
            }}
            className="w-full h-11 rounded-full text-sm border-border/40"
          >
            홈으로 돌아가기
          </Button>
        </div>
      )}

      {/* ── Login Alert ── */}
      <AlertDialog open={showLoginAlert} onOpenChange={setShowLoginAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>로그인이 필요합니다</AlertDialogTitle>
            <AlertDialogDescription>결과를 저장하거나 복사하려면 로그인이 필요해요.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-0">취소</AlertDialogCancel>
            <AlertDialogAction onClick={performLogin} className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
              로그인하고 결과 확인하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Detail Modal ── */}
      {selectedPlatform && (
        <ResultDetailModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedPlatform(null); }}
          platform={selectedPlatform}
          content={getContent(selectedPlatform) || ""}
          outputId={draftId || ""}
          isGuest={isGuest}
          isDraftMode={!isSessionType}
          onSave={() => (user ? null : setShowLoginAlert(true))}
          onCopy={(content) => handleCopyAction(content)}
        />
      )}
    </AppShell>
  );
};

export default DraftResult;
