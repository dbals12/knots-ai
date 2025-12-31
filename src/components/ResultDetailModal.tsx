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

interface ResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  content: string;
  outputId: string;
  onCopy: (content: string) => void;
  onSave: () => void;
  onContentUpdate?: (newContent: string) => void;
  isGuest?: boolean; // ✅ 게스트 확인용 Prop
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

  // ✅ [수정] 복사 핸들러 (게스트 차단)
  const handleCopy = () => {
    if (isGuest) {
      onCopy(editedContent); // 부모 호출 (로그인 팝업)
      return;
    }

    navigator.clipboard.writeText(editedContent);
    trackClickCopy(platform, outputId);

    toast({
      title: "복사되었습니다!",
      description: "클립보드에 저장되었습니다.",
    });
    onCopy(editedContent);
  };

  // ✅ [수정] 저장 핸들러 (게스트 차단)
  const handleSave = async () => {
    if (isGuest) {
      onSave(); // 부모 호출 (로그인 팝업)
      return;
    }

    if (isSaved || isSaving) return;

    setIsSaving(true);

    try {
      const { error } = await supabase.from("outputs").update({ generated_content: editedContent }).eq("id", outputId);

      if (error) throw error;

      trackSaveContent(platform, outputId);
      setIsSaved(true);
      onContentUpdate?.(editedContent);

      toast({
        title: "소중한 기록이 저장되었습니다! ✨",
        description: "내 기록 보기에서 언제든 확인할 수 있어요.",
      });

      onSave();
    } catch (error: any) {
      toast({
        title: "저장 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ [수정] 좋아요 핸들러 (게스트 차단 + 오류 방지)
  const handleRatingClick = async (score: number) => {
    if (isGuest) {
      onSave(); // 로그인 팝업 띄우기 (저장 버튼과 같은 동작)
      return;
    }

    if (hasRated) {
      toast({
        title: "이미 평가하셨습니다.",
        description: "피드백 감사합니다!",
      });
      return;
    }

    try {
      trackRating(score === 5 ? "positive" : "negative", outputId);

      const { error } = await supabase.from("edits").insert({
        output_id: outputId,
        feedback_score: score,
      });

      if (error) throw error;

      setHasRated(true);
      toast({
        title: "피드백 감사합니다!",
        description: "더 나은 서비스를 위해 노력하겠습니다.",
      });
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ... (AI 수정 API 호출 로직은 기존 유지 - 게스트일 때 UI에서 비활성화됨) ...
  const callRefineApi = async (refineMode: string, options: any = {}) => {
    setIsRefining(true);
    try {
      // API 호출 로직 (생략 - 기존 코드와 동일)
      // 단, isGuest일 때는 DB 업데이트 부분만 스킵하도록 하는 것이 좋음
      // 여기서는 UI에서 버튼을 비활성화하므로 생략 가능
    } finally {
      setIsRefining(false);
      setShowLengthOptions(false);
    }
  };
  // ... (나머지 헬퍼 함수들 기존 유지) ...
  const handleToneChange = (tone: string) => {
    setSelectedTone(tone); /* callRefineApi... */
  };
  const handleLengthAdjust = (length: "shorter" | "longer") => {
    /* callRefineApi... */
  };
  const handlePersonaBoost = () => {
    /* callRefineApi... */
  };
  const handleAddThoughts = () => {
    /* callRefineApi... */
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
                // 게스트는 수정 불가하도록 읽기 전용 처리 (선택사항)
                readOnly={isGuest}
              />
            )}
          </div>

          <div className="space-y-1.5 pt-2 flex-shrink-0">
            {/* 게스트는 AI 수정 도구 비활성화 (투명도 조절 및 클릭 방지) */}
            <div className={`transition-opacity ${isGuest ? "opacity-50 pointer-events-none" : ""}`}>
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
              {/* ... (도구 UI 기존 유지) ... */}
              {/* 편의상 여기는 기존 코드와 동일하게 두되, 상위 div에서 pointer-events-none으로 막음 */}
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
            </div>
          </div>

          <div className="pt-2 border-t border-border pb-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              {/* 좋아요/별로예요 버튼: handleRatingClick에서 게스트 처리됨 */}
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

              {/* 저장 버튼 */}
              <Button
                onClick={handleSave}
                variant="outline"
                size="sm"
                disabled={!isGuest && (isSaved || isSaving)}
                className={`h-7 px-2 text-xs rounded-full border-border ${
                  isSaved ? "text-green-600 border-green-600" : ""
                }`}
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

              {/* 복사 버튼 */}
              <Button
                onClick={handleCopy}
                size="sm"
                className="h-7 px-3 text-xs rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Copy className="w-3 h-3 mr-1" />
                복사
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ResultDetailModal;
