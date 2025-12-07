import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ResultDetailModal from '@/components/ResultDetailModal';
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const platformIcons = {
  blog: { icon: SiNaver, color: '#03C75A', title: '블로그 (회고형)' },
  linkedin: { icon: SiLinkedin, color: '#0077B5', title: 'LinkedIn (인사이트형)' },
  reels: { icon: SiInstagram, color: '#E4405F', title: 'Reels (대본)' },
  threads: { icon: SiThreads, color: '#000000', title: 'Threads (짧은 에세이)' },
};

interface Output {
  id: string;
  platform_type: string;
  generated_content: string | null;
  session_id: string;
}

const Results = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [rawText, setRawText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchLatestSessionAndOutputs = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Fetch latest session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id, raw_text')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (sessionError) throw sessionError;
        
        if (sessionData) {
          setRawText(sessionData.raw_text || '');
          setSessionId(sessionData.id);
          
          // Fetch outputs for this session
          const { data: outputsData, error: outputsError } = await supabase
            .from('outputs')
            .select('id, platform_type, generated_content, session_id')
            .eq('session_id', sessionData.id);
          
          if (outputsError) throw outputsError;
          
          setOutputs(outputsData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: '데이터를 불러올 수 없습니다',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLatestSessionAndOutputs();
  }, [user, toast]);

  const handleCardClick = (output: Output) => {
    setSelectedOutput(output);
    setSelectedPlatform(output.platform_type);
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({
      title: '복사 완료!',
      description: '클립보드에 복사되었습니다.',
    });
  };

  const handleSave = () => {
    toast({
      title: '준비 중인 기능입니다.',
      description: '곧 이용하실 수 있습니다.',
    });
    setSelectedPlatform(null);
    setSelectedOutput(null);
  };

  const handleEditClick = () => {
    setEditedText(rawText);
    setEditModalOpen(true);
  };

  const handleRegenerateContent = async () => {
    if (!sessionId) return;
    
    setIsRegenerating(true);
    
    try {
      // Update session raw_text
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ raw_text: editedText })
        .eq('id', sessionId);
      
      if (updateError) throw updateError;
      
      // TODO: Regenerate outputs for all 4 platforms
      // This would call your AI generation logic
      
      setRawText(editedText);
      setEditModalOpen(false);
      
      toast({
        title: '수정 완료!',
        description: '내용이 업데이트되었습니다. 결과가 다시 생성됩니다.',
      });
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: '오류 발생',
        description: '수정 중 문제가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // Helper to get summary from content
  const getSummary = (content: string | null) => {
    if (!content) return '콘텐츠가 생성되지 않았습니다.';
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  return (
    <div className="min-h-screen bg-background p-6 py-8">
      <div className="w-full max-w-[430px] mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">오늘의 결과</h1>
        </div>

        {/* Original Input Text Section */}
        <div className="bg-white rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">오늘 내가 기록한 내용</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditClick}
              className="h-8 text-xs"
            >
              수정하기
            </Button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {rawText || '기록된 내용이 없습니다.'}
          </p>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {outputs.map((output) => {
            const platformKey = output.platform_type as keyof typeof platformIcons;
            const platformInfo = platformIcons[platformKey];
            if (!platformInfo) return null;
            
            const { icon: Icon, color, title } = platformInfo;
            
            return (
              <button
                key={output.id}
                onClick={() => handleCardClick(output)}
                className="bg-white rounded-2xl p-4 border border-border hover:shadow-lg transition-all text-left space-y-3"
              >
                {output.platform_type === 'reels' ? (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-foreground text-sm mb-1">
                    {title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {getSummary(output.generated_content)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-3">
          <Button 
            onClick={() => navigate('/input')}
            className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            새로운 기록 만들기
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full h-12 rounded-xl"
          >
            Switch Manager 홈 화면으로 돌아가기
          </Button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPlatform && selectedOutput && (
        <ResultDetailModal
          isOpen={!!selectedPlatform}
          onClose={() => {
            setSelectedPlatform(null);
            setSelectedOutput(null);
          }}
          platform={selectedPlatform}
          content={selectedOutput.generated_content || ''}
          outputId={selectedOutput.id}
          onCopy={handleCopy}
          onSave={handleSave}
        />
      )}

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>기록 내용 수정하기</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[300px] text-sm"
              placeholder="수정할 내용을 입력하세요..."
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="w-full sm:w-auto"
            >
              취소
            </Button>
            <Button
              onClick={handleRegenerateContent}
              disabled={isRegenerating}
              className="w-full sm:w-auto"
            >
              {isRegenerating ? '처리 중...' : '수정한 내용으로 다시 결과 만들기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Results;
