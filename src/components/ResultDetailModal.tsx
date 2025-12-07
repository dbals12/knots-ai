import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Save, Sparkles, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const platformTitles: Record<string, string> = {
    blog: '블로그 (회고형)',
    linkedin: 'LinkedIn (인사이트형)',
    reels: 'Reels (대본)',
    threads: 'Threads (짧은 에세이)',
  };

  const toneToPersona: Record<string, string> = {
    professional: '전문가',
    friendly: '친근한 동료',
    witty: '위트있는 크리에이터',
    serious: '진지한 분석가',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
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
    try {
      const { error } = await supabase
        .from('outputs')
        .update({ generated_content: editedContent })
        .eq('id', outputId);

      if (error) throw error;

      onContentUpdate?.(editedContent);
      
      toast({
        title: '저장되었습니다.',
        description: '변경사항이 저장되었습니다.',
      });
      onSave();
    } catch (error: any) {
      toast({
        title: '저장 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRating = async (score: number) => {
    if (hasRated) {
      toast({
        title: '이미 평가하셨습니다.',
        description: '피드백 감사합니다!',
      });
      return;
    }

    try {
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
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
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

        <div className="flex flex-col h-[calc(100%-8rem)] space-y-4">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Generated Content */}
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[300px] resize-none border-border rounded-xl font-normal"
            />

            {/* AI Refinement Tools */}
            <div className="space-y-3 pb-4">
              <p className="text-sm font-semibold text-foreground">AI 수정 도구</p>
              
              <div className="flex flex-wrap gap-2">
                {/* Tone Dropdown */}
                <Select value={selectedTone} onValueChange={handleToneChange} disabled={isRefining}>
                  <SelectTrigger className="w-[140px] h-9 rounded-full border-border bg-background">
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
                    className="h-9 rounded-full px-4 border-border bg-background"
                  >
                    길이 조절
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleLengthAdjust('shorter')}
                      disabled={isRefining}
                      className="h-9 rounded-full px-3 border-border bg-background"
                    >
                      더 짧게
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleLengthAdjust('longer')}
                      disabled={isRefining}
                      className="h-9 rounded-full px-3 border-border bg-background"
                    >
                      더 길게
                    </Button>
                  </div>
                )}

                {/* Persona Enhance */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePersonaBoost}
                  disabled={isRefining}
                  className="h-9 rounded-full px-4 border-border bg-background"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  페르소나 강화
                </Button>
              </div>

              {/* Additional Thoughts Input */}
              <div className="flex gap-2">
                <Input
                  value={additionalThoughts}
                  onChange={(e) => setAdditionalThoughts(e.target.value)}
                  placeholder="내 생각 추가하기..."
                  className="h-10 rounded-xl border-border bg-background flex-1"
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
                  className="h-10 px-4 rounded-xl border-border"
                >
                  추가
                </Button>
              </div>
            </div>
          </div>

          {/* Rating UI */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">이 결과가 도움이 되었나요?</p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleRating(5)}
                variant="outline"
                size="sm"
                disabled={hasRated}
                className="flex-1 h-10 rounded-xl border-border"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                좋아요
              </Button>
              <Button
                onClick={() => handleRating(1)}
                variant="outline"
                size="sm"
                disabled={hasRated}
                className="flex-1 h-10 rounded-xl border-border"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                별로예요
              </Button>
            </div>
          </div>

          {/* Fixed Bottom Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleCopy}
              className="flex-1 h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              <Copy className="w-4 h-4 mr-2" />
              복사하기
            </Button>
            <Button
              onClick={handleSave}
              variant="outline"
              className="h-12 px-6 rounded-xl border-border"
            >
              <Save className="w-4 h-4 mr-2" />
              저장
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ResultDetailModal;
