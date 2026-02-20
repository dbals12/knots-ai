import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Save, Sparkles, ThumbsUp, ThumbsDown, Loader2, Check, Undo2, Redo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InstagramCardView from "./InstagramCardView";
import { trackClickCopy, trackSaveContent, trackRefineContent, trackRating } from "@/lib/analytics";
import track from "@/lib/track";
import { getAccessToken } from "@/lib/edgeFunctionAuth";

interface ResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  content: string;
  outputId: string;
  onCopy: (content: string) => void;
  onSave: () => void;
  onContentUpdate?: (newContent: string) => void;
  isGuest?: boolean;
  isDraftMode?: boolean;
}

const ResultDetailModal = ({
  isOpen,
  onClose,
  platform,
  content,
  outputId,
  onCopy,
  onSave,
  onContentUpdate,
  isGuest = false,
  isDraftMode = false,
}: ResultDetailModalProps) => {
  const [editedContent, setEditedContent] = useState(content);
  const [selectedTone, setSelectedTone] = useState("");
  const [additionalThoughts, setAdditionalThoughts] = useState("");
  const [hasRated, setHasRated] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showLengthOptions, setShowLengthOptions] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [historyState, setHistoryState] = useState<{
    history: string[];
    index: number;
  }>({ history: [content], index: 0 });

  const { toast } = useToast();

  useEffect(() => {
    setIsSaved(false);
  }, [editedContent]);

  useEffect(() => {
    setEditedContent(content);
    setHistoryState({ history: [content], index: 0 });
    setIsSaved(false);
    setHasRated(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputId]);

  const pushToHistory = useCallback((newContent: string) => {
    setHistoryState((prev) => {
      const newHistory = prev.history.slice(0, prev.index + 1);
      newHistory.push(newContent);
      return {
        history: newHistory,
        index: newHistory.length - 1,
      };
    });
  }, []);

  const canUndo = historyState.index > 0;
  const canRedo = historyState.index < historyState.history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    setHistoryState((prev) => {
      const newIndex = prev.index - 1;
      setEditedContent(prev.history[newIndex]);
      return { ...prev, index: newIndex };
    });
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    setHistoryState((prev) => {
      const newIndex = prev.index + 1;
      setEditedContent(prev.history[newIndex]);
      return { ...prev, index: newIndex };
    });
  }, [canRedo]);

  const platformTitles: Record<string, string> = {
    blog: "블로그 (회고형)",
    linkedin: "LinkedIn (인사이트형)",
    reels: "인스타 (카드뉴스 & 캡션)",
    threads: "Threads (짧은 에세이)",
  };

  const isInstagram = platform === "reels";

  const toneToPersona: Record<string, string> = {
    professional: "전문가",
    friendly: "친근한 동료",
    witty: "위트있는 크리에이터",
    serious: "진지한 분석가",
  };

  // ✅ 복사 핸들러: 게스트면 부모(로그인 팝업) 호출, 회원이면 복사 실행
  const handleCopy = () => {
    if (isGuest) {
      onCopy(editedContent);
      return;
    }
    navigator.clipboard.writeText(editedContent);
    trackClickCopy(platform, outputId);
    track.clickCopy(platform, { session_id: outputId });
    toast({ title: "복사되었습니다!", description: "클립보드에 저장되었습니다." });
    onCopy(editedContent);
  };

  // ✅ 저장 핸들러: 게스트(로그인유도) / Draft모드(로컬저장) / 회원(DB저장) 분기
  const handleSave = async () => {
    if (isGuest) {
      onSave();
      return;
    } // 게스트 -> 로그인 팝업
    if (isSaved || isSaving) return;

    // Draft 모드(게스트)면 DB 저장 건너뛰고 로컬 상태만 업데이트
    if (isDraftMode) {
      onContentUpdate?.(editedContent);
      setIsSaved(true);
      toast({ title: "저장되었습니다", description: "수정 내용이 반영되었습니다." });
      return;
    }

    // 회원 모드면 실제 DB 저장
    setIsSaving(true);
    try {
      // outputs 테이블 업데이트 (DraftResult가 처리하도록 위임하거나 직접 수행)
      // 여기서는 UI 일관성을 위해 직접 업데이트
      const { error } = await supabase.from("outputs").update({ generated_content: editedContent }).eq("id", outputId);
      if (error) throw error;

      trackSaveContent(platform, outputId);
      track.saveContent(platform, { session_id: outputId });
      setIsSaved(true);
      onContentUpdate?.(editedContent); // 부모에게 알림
      toast({ title: "저장 완료!", description: "내 기록에 안전하게 저장되었습니다." });
    } catch (error: any) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ 좋아요 핸들러: Draft 모드일 때 오류 방지 (DB 저장 스킵)
  const handleRatingClick = async (score: number) => {
    if (isGuest) {
      onSave();
      return;
    }
    if (hasRated) {
      toast({ title: "이미 평가하셨습니다.", description: "피드백 감사합니다!" });
      return;
    }

    if (isDraftMode) {
      setHasRated(true);
      toast({ title: "피드백 감사합니다!", description: "의견이 반영되었습니다." });
      return;
    }

    try {
      trackRating(score === 5 ? "positive" : "negative", outputId);
      // ✅ Supabase events via unified track
      if (score === 5) {
        track.thumbUp(platform, { session_id: outputId });
      } else {
        track.thumbDown(platform, { session_id: outputId });
      }
      const { error } = await supabase.from("edits").insert({ output_id: outputId, feedback_score: score });
      if (error) throw error;
      setHasRated(true);
      toast({ title: "피드백 감사합니다!", description: "더 나은 서비스를 위해 노력하겠습니다." });
    } catch (error: any) {
      console.error(error);
      toast({ title: "피드백 감사합니다!", description: "의견이 반영되었습니다." });
    }
  };

  // ✅ AI 수정 API 호출
  const callRefineApi = async (refineMode: string, options: any = {}) => {
    setIsRefining(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast({ title: "로그인이 필요합니다", description: "다시 로그인해 주세요.", variant: "destructive" });
        return;
      }

      trackRefineContent(refineMode, platform);
      const response = await supabase.functions.invoke("refine-output", {
        body: {
          original_content: editedContent,
          refine_mode: refineMode,
          user_persona: options.userPersona || selectedTone ? toneToPersona[selectedTone] : undefined,
          target_length: options.targetLength,
          extra_thoughts: options.extraThoughts,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.error) throw response.error;
      const { refined_content } = response.data;

      if (refined_content) {
        setEditedContent(refined_content);
        pushToHistory(refined_content);

        // 정식 회원일 때만 edits/outputs 테이블에 기록
        if (!isGuest && !isDraftMode) {
          await supabase.from("outputs").update({ generated_content: refined_content }).eq("id", outputId);
          await supabase.from("edits").insert({
            output_id: outputId,
            edit_type: refineMode,
            refinement_prompt: options.extraThoughts || options.targetLength || options.userPersona || refineMode,
          });
        }

        onContentUpdate?.(refined_content);
        toast({ title: "수정 완료", description: "콘텐츠가 수정되었습니다." });
      }
    } catch (error: any) {
      console.error("Refine error:", error);
      toast({ title: "수정 실패", description: error.message || "다시 시도해주세요.", variant: "destructive" });
    } finally {
      setIsRefining(false);
      setShowLengthOptions(false);
    }
  };

  const handleToneChange = (tone: string) => {
    setSelectedTone(tone);
    track.aiTool("change_tone", platform, { session_id: outputId, tone });
    callRefineApi("tone", { userPersona: toneToPersona[tone] });
  };
  const handleLengthAdjust = (length: "shorter" | "longer") => {
    track.aiTool("adjust_length", platform, { session_id: outputId, length });
    callRefineApi("length", { targetLength: length });
  };
  const handlePersonaBoost = () => {
    track.aiTool("apply_persona", platform, { session_id: outputId });
    callRefineApi("persona_boost");
  };
  const handleAddThoughts = () => {
    if (!additionalThoughts.trim()) {
      toast({ title: "내용을 입력해주세요", variant: "destructive" });
      return;
    }
    track.aiTool("add_thought", platform, { session_id: outputId });
    callRefineApi("add_thoughts", { extraThoughts: additionalThoughts });
    setAdditionalThoughts("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[85vh] max-h-[85vh] rounded-t-3xl flex flex-col overflow-hidden"
        onSwipeClose={onClose}
      >
        <SheetHeader className="pb-3 flex-shrink-0">
          <SheetTitle className="text-xl font-bold">{platformTitles[platform] || platform}</SheetTitle>
        </SheetHeader>

        {isRefining && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50 rounded-t-3xl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-foreground" />
              <p className="text-sm text-muted-foreground">AI가 수정 중입니다...</p>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 pb-safe">
          <div className="flex-1 min-h-0 overflow-y-auto mb-3">
            {isInstagram ? (
              <InstagramCardView content={editedContent} />
            ) : (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="h-full min-h-full resize-none border-border rounded-xl font-normal"
              />
            )}
          </div>

          <div className="space-y-1.5 pt-2 flex-shrink-0">
            {/* ✅ 게스트도 AI 수정 도구 사용 가능 (제한 없음) */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">AI 수정 도구</p>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={!canUndo || isRefining}
                    className="h-6 w-6 p-0 rounded-full"
                  >
                    <Undo2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRedo}
                    disabled={!canRedo || isRefining}
                    className="h-6 w-6 p-0 rounded-full"
                  >
                    <Redo2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Select value={selectedTone} onValueChange={handleToneChange} disabled={isRefining}>
                  <SelectTrigger className="w-[100px] h-7 text-xs rounded-full border-border bg-background">
                    <SelectValue placeholder="톤 변경" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">전문적으로</SelectItem>
                    <SelectItem value="friendly">친근하게</SelectItem>
                    <SelectItem value="witty">위트있게</SelectItem>
                    <SelectItem value="serious">진지하게</SelectItem>
                  </SelectContent>
                </Select>
                {!showLengthOptions ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLengthOptions(true)}
                    disabled={isRefining}
                    className="h-7 text-xs rounded-full px-2.5 border-border bg-background"
                  >
                    길이 조절
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLengthAdjust("shorter")}
                      disabled={isRefining}
                      className="h-7 text-xs rounded-full px-2 border-border bg-background"
                    >
                      짧게
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLengthAdjust("longer")}
                      disabled={isRefining}
                      className="h-7 text-xs rounded-full px-2 border-border bg-background"
                    >
                      길게
                    </Button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePersonaBoost}
                  disabled={isRefining}
                  className="h-7 text-xs rounded-full px-2.5 border-border bg-background"
                >
                  <Sparkles className="w-3 h-3 mr-0.5" /> 페르소나
                </Button>
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <Input
                  value={additionalThoughts}
                  onChange={(e) => setAdditionalThoughts(e.target.value)}
                  placeholder="내 생각 추가..."
                  className="h-7 text-xs rounded-full border-border bg-background flex-1 px-3"
                  disabled={isRefining}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddThoughts();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddThoughts}
                  disabled={isRefining || !additionalThoughts.trim()}
                  className="h-7 text-xs px-2.5 rounded-full border-border"
                >
                  추가
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border pb-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => handleRatingClick(5)}
                variant="ghost"
                size="sm"
                disabled={hasRated}
                className="h-7 px-2 text-xs rounded-full"
              >
                <ThumbsUp className="w-3 h-3 mr-1" /> 좋아요
              </Button>
              <Button
                onClick={() => handleRatingClick(1)}
                variant="ghost"
                size="sm"
                disabled={hasRated}
                className="h-7 px-2 text-xs rounded-full"
              >
                <ThumbsDown className="w-3 h-3 mr-1" /> 별로예요
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleSave}
                variant="outline"
                size="sm"
                disabled={!isGuest && !isDraftMode && (isSaved || isSaving)}
                className={`h-7 px-2 text-xs rounded-full border-border ${isSaved ? "text-green-600 border-green-600" : ""}`}
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : isSaved ? (
                  <Check className="w-3 h-3 mr-1" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                {isSaved ? "저장됨" : "저장"}
              </Button>
              <Button
                onClick={handleCopy}
                size="sm"
                className="h-7 px-3 text-xs rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Copy className="w-3 h-3 mr-1" /> 복사
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ResultDetailModal;
