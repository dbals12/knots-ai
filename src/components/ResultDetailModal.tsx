import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Save, Sparkles, ThumbsUp, ThumbsDown, Loader2, Check, Undo2, Redo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import InstagramCardView from './InstagramCardView';
import { trackClickCopy, trackSaveContent, trackRefineContent, trackRating } from '@/lib/analytics';

interface ResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  content: string;
  outputId: string;
  onCopy: (content: string) => void;
  onSave: () => void;
  onContentUpdate?: (newContent: string) => void;
}

const ResultDetailModal = ({ isOpen, onClose, platform, content, outputId, onCopy, onSave, onContentUpdate }: ResultDetailModalProps) => {
  const [editedContent, setEditedContent] = useState(content);
  const [selectedTone, setSelectedTone] = useState('');
  const [additionalThoughts, setAdditionalThoughts] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showLengthOptions, setShowLengthOptions] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Undo/Redo history state - use combined state for atomic updates
  const [historyState, setHistoryState] = useState<{
    history: string[];
    index: number;
  }>({ history: [content], index: 0 });
  
  const { toast } = useToast();

  // Reset saved state when content changes (e.g., after AI refinement)
  useEffect(() => {
    setIsSaved(false);
  }, [editedContent]);

  // Reset state when modal opens with NEW output (different outputId)
  // Don't reset on content changes since our own refinements trigger content updates
  useEffect(() => {
    setEditedContent(content);
    setHistoryState({ history: [content], index: 0 });
    setIsSaved(false);
    setHasRated(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputId]); // Only reset when outputId changes, not content

  // Push new content to history (for AI refinements)
  const pushToHistory = useCallback((newContent: string) => {
    setHistoryState(prev => {
      // Remove any "future" history when branching
      const newHistory = prev.history.slice(0, prev.index + 1);
      newHistory.push(newContent);
      return {
        history: newHistory,
        index: newHistory.length - 1
      };
    });
  }, []);

  const canUndo = historyState.index > 0;
  const canRedo = historyState.index < historyState.history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    setHistoryState(prev => {
      const newIndex = prev.index - 1;
      setEditedContent(prev.history[newIndex]);
      return { ...prev, index: newIndex };
    });
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    setHistoryState(prev => {
      const newIndex = prev.index + 1;
      setEditedContent(prev.history[newIndex]);
      return { ...prev, index: newIndex };
    });
  }, [canRedo]);

  const platformTitles: Record<string, string> = {
    blog: '블로그 (회고형)',
    linkedin: 'LinkedIn (인사이트형)',
    reels: '인스타 (카드뉴스 & 캡션)',
    threads: 'Threads (짧은 에세이)',
  };

  const isInstagram = platform === 'reels';

  const toneToPersona: Record<string, string> = {
    professional: '전문가',
    friendly: '친근한 동료',
    witty: '위트있는 크리에이터',
    serious: '진지한 분석가',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
    
    // Track copy event
    trackClickCopy(platform, outputId);
    
    toast({
      title: '복사되었습니다!',
      description: '클립보드에 저장되었습니다.',
    });
    onCopy(editedContent);
  };

  const callRefineApi = async (refineMode: string, options: { 
    targetLength?: string; 
    extraThoughts?: string;
    userPersona?: string;
  } = {}) => {
    setIsRefining(true);
    
    try {
      // Track refinement event
      trackRefineContent(refineMode, platform);
      
      const response = await supabase.functions.invoke('refine-output', {
        body: {
          original_content: editedContent,
          refine_mode: refineMode,
          user_persona: options.userPersona || selectedTone ? toneToPersona[selectedTone] : undefined,
          target_length: options.targetLength,
          extra_thoughts: options.extraThoughts,
        },
      });

      if (response.error) throw response.error;

      const { refined_content } = response.data;
      
      if (refined_content) {
        setEditedContent(refined_content);
        pushToHistory(refined_content); // Add to undo/redo history
        
        // Update outputs table
        const { error: updateError } = await supabase
          .from('outputs')
          .update({ generated_content: refined_content })
          .eq('id', outputId);

        if (updateError) throw updateError;

        // Log to edits table
        await supabase.from('edits').insert({
          output_id: outputId,
          edit_type: refineMode,
          refinement_prompt: options.extraThoughts || options.targetLength || options.userPersona || refineMode,
        });

        // Notify parent of content update
        onContentUpdate?.(refined_content);

        toast({
          title: '수정 완료',
          description: '콘텐츠가 수정되었습니다.',
        });
      }
    } catch (error: any) {
      console.error('Refine error:', error);
      toast({
        title: '수정 실패',
        description: error.message || '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsRefining(false);
      setShowLengthOptions(false);
    }
  };

  const handleToneChange = (tone: string) => {
    setSelectedTone(tone);
    callRefineApi('tone', { userPersona: toneToPersona[tone] });
  };

  const handleLengthAdjust = (length: 'shorter' | 'longer') => {
    callRefineApi('length', { targetLength: length });
  };

  const handlePersonaBoost = () => {
    callRefineApi('persona_boost');
  };

  const handleAddThoughts = () => {
    if (!additionalThoughts.trim()) {
      toast({
        title: '내용을 입력해주세요',
        variant: 'destructive',
      });
      return;
    }
    callRefineApi('add_thoughts', { extraThoughts: additionalThoughts });
    setAdditionalThoughts('');
  };

  const handleSave = async () => {
    if (isSaved || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('outputs')
        .update({ generated_content: editedContent })
        .eq('id', outputId);

      if (error) throw error;

      // Track save event
      trackSaveContent(platform, outputId);

      // Mark as saved
      setIsSaved(true);
      
      // Notify parent of content update
      onContentUpdate?.(editedContent);
      
      toast({
        title: '소중한 기록이 저장되었습니다! ✨',
        description: '내 기록 보기에서 언제든 확인할 수 있어요.',
      });
      
      onSave();
    } catch (error: any) {
      toast({
        title: '저장 실패',
        description: error.message || '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRatingClick = async (score: number) => {
    if (hasRated) {
      toast({
        title: '이미 평가하셨습니다.',
        description: '피드백 감사합니다!',
      });
      return;
    }

    try {
      // Track rating event
      trackRating(score === 5 ? 'positive' : 'negative', outputId);
      
      const { error } = await supabase.from('edits').insert({
        output_id: outputId,
        feedback_score: score,
      });

      if (error) throw error;

      setHasRated(true);
      toast({
        title: '피드백 감사합니다!',
        description: '더 나은 서비스를 위해 노력하겠습니다.',
      });
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="max-h-[85vh] rounded-t-3xl overflow-y-auto"
        onSwipeClose={onClose}
      >
        <SheetHeader className="pb-4 sticky top-0 bg-background z-10">
          <SheetTitle className="text-xl font-bold">
            {platformTitles[platform] || platform}
          </SheetTitle>
        </SheetHeader>

        {isRefining && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50 rounded-t-3xl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-foreground" />
              <p className="text-sm text-muted-foreground">AI가 수정 중입니다...</p>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-4 pb-safe">
          {/* Generated Content - Special view for Instagram */}
          {isInstagram ? (
            <InstagramCardView content={editedContent} />
          ) : (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[200px] resize-none border-border rounded-xl font-normal"
            />
          )}

          {/* AI Refinement Tools - Compact */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">AI 수정 도구</p>
              
              {/* Undo/Redo Buttons */}
              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo || isRefining}
                  className="h-6 w-6 p-0 rounded-full"
                  title="실행 취소"
                >
                  <Undo2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!canRedo || isRefining}
                  className="h-6 w-6 p-0 rounded-full"
                  title="다시 실행"
                >
                  <Redo2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Tone Dropdown */}
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

              {/* Length Toggle */}
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
                    onClick={() => handleLengthAdjust('shorter')}
                    disabled={isRefining}
                    className="h-7 text-xs rounded-full px-2 border-border bg-background"
                  >
                    짧게
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleLengthAdjust('longer')}
                    disabled={isRefining}
                    className="h-7 text-xs rounded-full px-2 border-border bg-background"
                  >
                    길게
                  </Button>
                </div>
              )}

              {/* Persona Enhance */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePersonaBoost}
                disabled={isRefining}
                className="h-7 text-xs rounded-full px-2.5 border-border bg-background"
              >
                <Sparkles className="w-3 h-3 mr-0.5" />
                페르소나
              </Button>
            </div>

            {/* Additional Thoughts Input - Compact */}
            <div className="flex gap-1.5">
              <Input
                value={additionalThoughts}
                onChange={(e) => setAdditionalThoughts(e.target.value)}
                placeholder="내 생각 추가..."
                className="h-7 text-xs rounded-full border-border bg-background flex-1 px-3"
                disabled={isRefining}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
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

          {/* Compact Footer - All in one row */}
          <div className="pt-2 border-t border-border pb-3">
            <div className="flex items-center gap-1.5">
              {/* Rating Buttons - Icon + Text, Small */}
              <Button
                onClick={() => handleRatingClick(5)}
                variant="ghost"
                size="sm"
                disabled={hasRated}
                className="h-7 px-2 text-xs rounded-full"
              >
                <ThumbsUp className="w-3 h-3 mr-1" />
                좋아요
              </Button>
              <Button
                onClick={() => handleRatingClick(1)}
                variant="ghost"
                size="sm"
                disabled={hasRated}
                className="h-7 px-2 text-xs rounded-full"
              >
                <ThumbsDown className="w-3 h-3 mr-1" />
                별로예요
              </Button>
              
              <div className="flex-1" />
              
              {/* Save Button - Icon + Text */}
              <Button
                onClick={handleSave}
                variant="outline"
                size="sm"
                disabled={isSaved || isSaving}
                className={`h-7 px-2 text-xs rounded-full border-border ${
                  isSaved ? 'text-green-600 border-green-600' : ''
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : isSaved ? (
                  <Check className="w-3 h-3 mr-1" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                {isSaved ? '저장됨' : '저장'}
              </Button>
              
              {/* Copy Button - Primary */}
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
