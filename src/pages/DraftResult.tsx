import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, ChevronDown, ChevronUp, Lock, ArrowRight, Check, Sparkles, Loader2,
} from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import ResultDetailModal from "@/components/ResultDetailModal";
import GlassOrb from "@/components/GlassOrb";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import track from "@/lib/track";
import { getSessionId } from "@/lib/session";

// ───────────────────────────── Types ─────────────────────────────
interface TPSection { title: string; content: string; items?: string[] }
interface TransformationProcess {
  raw_materials: TPSection;
  core_point: TPSection;
  writing_flow: TPSection;
  format_conversion: TPSection;
}
interface ResultData {
  blog_content?: string;
  linkedin_content?: string;
  reels_content?: string;
  threads_content?: string;
  analysis_type?: "A" | "B" | "C" | string;
  original_summary?: string;
  input_quality?: { level?: string; reason?: string; suggestion?: string };
  transformation_process?: TransformationProcess;
}
interface ContentData {
  input_text: string;
  input_mode?: string;
  result_data: ResultData;
}

// ───────────────────────────── Helpers ─────────────────────────────
const platformIcons = {
  blog:     { icon: SiNaver,     color: "#03C75A", title: "블로그 글" },
  linkedin: { icon: SiLinkedin,  color: "#0077B5", title: "LinkedIn 글" },
  reels:    { icon: SiInstagram, color: "#E4405F", title: "Instagram 카드뉴스 + 캡션" },
  threads:  { icon: SiThreads,   color: "#000000", title: "Threads 글" },
} as const;

const FALLBACK_TP_TEXT =
  "아직 기록이 짧아 숨은 흐름을 충분히 발견하기 어려워요. 조금 더 구체적으로 적어주면, 생각의 재료와 글의 흐름을 더 잘 정리해드릴게요.";

const cleanText = (s?: string) =>
  (s || "").replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

const trimTo = (s: string, n: number) => (s.length > n ? s.substring(0, n) + "…" : s);

const getReelsPreview = (raw?: string): string => {
  const c = cleanText(raw);
  if (!c) return "";
  try {
    const j = JSON.parse(c);
    const slide = j["Slide 1"] || j["slide 1"] || Object.values(j)[0];
    return typeof slide === "string" ? trimTo(slide, 60) : trimTo(c, 60);
  } catch {
    return trimTo(c.replace(/[{}\"]/g, " ").replace(/\s+/g, " "), 60);
  }
};

const previewFor = (key: keyof typeof platformIcons, rd: ResultData): string => {
  if (key === "blog") return trimTo(cleanText(rd.blog_content).replace(/^#+\s.*$/gm, "").trim(), 70);
  if (key === "linkedin") return trimTo(cleanText(rd.linkedin_content), 70);
  if (key === "threads") return trimTo(cleanText(rd.threads_content), 70);
  if (key === "reels") return getReelsPreview(rd.reels_content);
  return "";
};

// Fallback transformation_process when LLM didn't provide one (legacy data)
const buildFallbackTP = (rd: ResultData, inputText: string): TransformationProcess | null => {
  if (!rd.blog_content && !rd.linkedin_content && !inputText) return null;
  return {
    raw_materials: {
      title: "핵심 재료 추출",
      content: "이전 기록은 변환 과정 정보가 없어 콘텐츠 결과만 확인할 수 있어요.",
      items: [],
    },
    core_point: { title: "핵심 포인트 정리", content: FALLBACK_TP_TEXT },
    writing_flow: { title: "글의 흐름 구성", content: "기록 → 정리 → 글감 → 콘텐츠" },
    format_conversion: {
      title: "콘텐츠 포맷 변환",
      content: "이 흐름을 블로그, LinkedIn, Instagram, Threads에 맞게 다시 구성했어요.",
    },
  };
};

// ───────────────────────────── Input card ─────────────────────────────
interface DraftInputCardProps {
  summaryText: string;
  fullText: string;
  isEditing: boolean;
  editedInput: string;
  savingInput: boolean;
  onEditClick: () => void;
  onCancel: () => void;
  onSave: () => void;
  onEditedInputChange: (v: string) => void;
}
const DraftInputCard = ({
  summaryText, fullText, isEditing, editedInput, savingInput,
  onEditClick, onCancel, onSave, onEditedInputChange,
}: DraftInputCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? fullText : summaryText;
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="text-sm font-medium text-foreground">오늘 내가 기록한 내용</h3>
        {!isEditing ? (
          <button
            onClick={onEditClick}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-full bg-muted/50 flex-shrink-0"
          >
            수정하기
          </button>
        ) : (
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs rounded-lg" disabled={savingInput}>취소</Button>
            <Button size="sm" onClick={onSave} className="h-7 text-xs rounded-lg bg-foreground text-background hover:bg-foreground/90" disabled={savingInput || !editedInput.trim()}>
              {savingInput ? "저장 중..." : "저장"}
            </Button>
          </div>
        )}
      </div>
      {!isEditing ? (
        <div>
          <p className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap ${expanded ? "" : "line-clamp-2"}`}>
            {display}
          </p>
          {fullText && fullText.length > (summaryText?.length || 0) + 5 && (
            <button onClick={() => setExpanded(!expanded)} className="mt-1 flex items-center gap-0.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              {expanded ? <><ChevronUp className="w-3 h-3" /> 접기</> : <><ChevronDown className="w-3 h-3" /> 더보기</>}
            </button>
          )}
        </div>
      ) : (
        <textarea
          value={editedInput}
          onChange={(e) => onEditedInputChange(e.target.value)}
          className="w-full min-h-[120px] max-h-[220px] p-3 rounded-xl border border-border/40 bg-muted/30 text-xs text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      )}
    </div>
  );
};

// ───────────────────────────── Transformation Step ─────────────────────────────
interface StepProps {
  index: number;
  title: string;
  content: string;
  items?: string[];
  locked?: boolean;
  isLast?: boolean;
}
const TransformationStep = ({ index, title, content, items, locked, isLast }: StepProps) => (
  <div className="flex gap-3">
    {/* Indicator + connector */}
    <div className="flex flex-col items-center flex-shrink-0">
      <div className="w-7 h-7 rounded-full bg-foreground/90 text-background flex items-center justify-center text-xs font-medium">
        {index}
      </div>
      {!isLast && <div className="w-px flex-1 bg-border/60 my-1" />}
    </div>
    {/* Card */}
    <div className={`flex-1 mb-3 rounded-2xl bg-background border border-border/40 shadow-[0_2px_10px_hsla(0,0%,0%,0.04)] p-4 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {locked ? (
          <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
        ) : (
          <Check className="w-3.5 h-3.5 text-foreground/40" />
        )}
      </div>
      <p className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap ${locked ? "blur-[3px] select-none" : ""}`}>
        {content}
      </p>
      {!locked && items && items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {items.map((it, i) => (
            <span key={i} className="text-[11px] text-foreground/80 bg-muted/60 px-2 py-0.5 rounded-full">
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ───────────────────────────── Main Page ─────────────────────────────
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
    const messages = ["AI가 기록을 분석하고 있어요...", "핵심 재료를 추출하고 있어요...", "글의 흐름을 정리하고 있어요...", "콘텐츠로 변환 중이에요!"];
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

  // ── Data polling ──
  const checkData = async () => {
    try {
      if (isSessionType) {
        const { data: session } = await supabase.from("sessions").select("*").eq("id", draftId).single();
        const { data: outputs } = await supabase.from("outputs").select("*").eq("session_id", draftId);
        // Pull latest related draft to recover analysis fields (no schema change)
        const { data: relatedDraft } = await supabase
          .from("drafts").select("result_data")
          .eq("session_id", draftId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const draftRD = (relatedDraft?.result_data as any) || {};
        if (session) {
          const result_data: ResultData = {
            analysis_type: draftRD.analysis_type,
            original_summary: draftRD.original_summary,
            input_quality: draftRD.input_quality,
            transformation_process: draftRD.transformation_process,
          };
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
          const resultData = (draft.result_data as ResultData) || {};
          if (draft.status === "completed" && Object.keys(resultData).length > 0) {
            setData({
              input_text: (resultData as any)?.transcript || inputData?.textInput || "변환 중...",
              input_mode: inputData?.inputMode,
              result_data: resultData,
            });
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
          result_data: {
            blog_content: result.outputs.blog_content,
            linkedin_content: result.outputs.linkedin_content,
            reels_content: result.outputs.reels_content,
            threads_content: result.outputs.threads_content,
            analysis_type: result.analysis?.analysis_type,
            original_summary: result.analysis?.original_summary,
            input_quality: result.analysis?.input_quality,
            transformation_process: result.analysis?.transformation_process,
          },
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
        <div className="flex-1 flex flex-col items-center justify-center gap-6 h-[100dvh] px-6">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Spinning loader ring */}
            <div className="absolute inset-0 rounded-full border-[3px] border-border/40 border-t-amber-400 border-r-amber-400/60 animate-spin" style={{ animationDuration: "1.4s" }} />
            {/* Inner circle with sparkle */}
            <div className="relative w-[88px] h-[88px] rounded-full bg-white border border-border/40 shadow-[0_8px_24px_-8px_hsla(40,80%,50%,0.25)] flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-amber-400 fill-amber-400 drop-shadow-[0_2px_6px_hsla(40,90%,55%,0.5)] animate-pulse" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-base font-bold text-foreground">{loadingMessage}</p>
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

  const rd = data.result_data;
  const isGuest = !user;
  const platformOrder = ["blog", "linkedin", "reels", "threads"] as const;

  // Resolve summary (prefer LLM original_summary; fall back to truncated raw)
  const summaryText =
    cleanText(rd.original_summary) ||
    trimTo(cleanText(data.input_text).replace(/\n+/g, " "), 90);

  const tp: TransformationProcess | null =
    rd.transformation_process || buildFallbackTP(rd, data.input_text);

  const steps = tp
    ? [
        { ...tp.raw_materials,     items: tp.raw_materials.items, locked: false },
        { ...tp.core_point,        locked: false },
        { ...tp.writing_flow,      locked: false },
        { ...tp.format_conversion, locked: isGuest },
      ]
    : [];

  return (
    <AppShell>
      <div className={`flex-1 px-5 py-4 space-y-5 overflow-y-auto ${isGuest ? "pb-44" : "pb-32"}`}>
        {/* ── Headline ── */}
        <div className="pt-1">
          <h1 className="text-[22px] leading-snug font-bold text-foreground tracking-tight">
            기록이 4가지<br />글감으로 정리됐어요
          </h1>
        </div>

        {/* ── 오늘 내가 기록한 내용 ── */}
        <DraftInputCard
          summaryText={summaryText}
          fullText={data.input_text}
          isEditing={isEditingInput}
          editedInput={editedInput}
          savingInput={savingInput}
          onEditClick={handleEditInputClick}
          onCancel={handleCancelEdit}
          onSave={handleSaveEditedInput}
          onEditedInputChange={setEditedInput}
        />

        {/* ── AI가 이렇게 정리했어요 ── */}
        {steps.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">AI가 이렇게 정리했어요</h2>
            <div>
              {steps.map((s, i) => (
                <TransformationStep
                  key={i}
                  index={i + 1}
                  title={s.title}
                  content={s.content}
                  items={s.items}
                  locked={s.locked}
                  isLast={i === steps.length - 1}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 콘텐츠로 변환 ── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">콘텐츠로 변환</h2>
          <div className="grid grid-cols-2 gap-3">
            {platformOrder.map((key, idx) => {
              const meta = platformIcons[key];
              const Icon = meta.icon;
              const preview = previewFor(key, rd);
              const lockedCard = isGuest && idx > 0; // first card preview-only, others blurred
              return (
                <button
                  key={key}
                  onClick={() => handleCardClick(key)}
                  className="rounded-2xl bg-background border border-border/40 shadow-[0_2px_10px_hsla(0,0%,0%,0.04)] p-3.5 text-left space-y-2 relative overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${key === "reels" ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : ""}`}
                      style={{ backgroundColor: key === "reels" ? undefined : meta.color }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground line-clamp-1">{meta.title}</span>
                    {lockedCard && <Lock className="w-3 h-3 text-muted-foreground/40 ml-auto flex-shrink-0" />}
                  </div>
                  <p className={`text-[11px] text-muted-foreground leading-relaxed line-clamp-3 ${lockedCard ? "blur-[3px] select-none" : ""}`}>
                    {preview || "콘텐츠 미리보기"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Logged-in action buttons ── */}
        {!isGuest && (
          <div className="pt-2 space-y-2">
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
      </div>

      {/* ── Guest Bottom Sheet CTA ── */}
      {isGuest && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-background border-t border-border/30 rounded-t-[24px] shadow-[0_-8px_28px_hsla(0,0%,0%,0.08)] p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">변환 과정과 전체 글 확인하기</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              내 기록이 어떻게 글이 됐는지 확인하고,<br />4가지 콘텐츠를 모두 저장할 수 있어요.
            </p>
          </div>
          <button
            onClick={performLogin}
            className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            Google로 로그인 <ArrowRight className="w-4 h-4" />
          </button>
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
