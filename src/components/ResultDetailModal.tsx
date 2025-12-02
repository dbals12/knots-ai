import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Save, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
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
}

const ResultDetailModal = ({ isOpen, onClose, platform, content, outputId, onCopy, onSave }: ResultDetailModalProps) => {
  const [editedContent, setEditedContent] = useState(content);
  const [selectedTone, setSelectedTone] = useState('');
  const [additionalThoughts, setAdditionalThoughts] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const { toast } = useToast();

  const platformTitles: Record<string, string> = {
    blog: '블로그 (회고형)',
    linkedin: 'LinkedIn (인사이트형)',
    reels: 'Reels (대본)',
    threads: 'Threads (짧은 에세이)',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
    toast({
      title: '복사되었습니다!',
      description: '클립보드에 저장되었습니다.',
    });
    onCopy(editedContent);
  };

  const handleFeatureNotReady = () => {
    toast({
      title: '준비 중인 기능입니다.',
      description: '곧 이용하실 수 있습니다.',
    });
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
        created_at: new Date().toISOString(),
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
                <Select value={selectedTone} onValueChange={(val) => {
                  setSelectedTone(val);
                  handleFeatureNotReady();
                }}>
                  <SelectTrigger className="w-[140px] h-9 rounded-full border-border bg-white">
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleFeatureNotReady}
                  className="h-9 rounded-full px-4 border-border bg-white"
                >
                  길이 조절
                </Button>

                {/* Persona Enhance */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleFeatureNotReady}
                  className="h-9 rounded-full px-4 border-border bg-white"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  페르소나 강화
                </Button>
              </div>

              {/* Additional Thoughts Input */}
              <Input
                value={additionalThoughts}
                onChange={(e) => setAdditionalThoughts(e.target.value)}
                placeholder="내 생각 추가하기..."
                className="h-10 rounded-xl border-border bg-white"
              />
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
              onClick={() => {
                handleFeatureNotReady();
                onSave();
              }}
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
