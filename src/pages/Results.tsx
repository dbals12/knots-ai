import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ResultDetailModal from '@/components/ResultDetailModal';
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';

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
  const [editedText, setEditedText] = useState('');
  const [rawText, setRawText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sessionMood, setSessionMood] = useState('');
  const [sessionPersona, setSessionPersona] = useState('');
  const [sessionPurpose, setSessionPurpose] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchLatestSessionAndOutputs = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Fetch latest session with context data
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id, raw_text, selected_mood, selected_persona, session_purpose')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (sessionError) throw sessionError;
        
        if (sessionData) {
          const text = sessionData.raw_text || '';
          setRawText(text);
          setOriginalText(text);
          setEditedText(text);
          setSessionId(sessionData.id);
          setSessionMood(sessionData.selected_mood || '');
          setSessionPersona(sessionData.selected_persona || '');
          setSessionPurpose(sessionData.session_purpose || '');
          
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

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - restore original
      setEditedText(rawText);
    }
    setIsEditing(!isEditing);
  };

  const handleKeepOriginal = () => {
    setEditedText(rawText);
    setIsEditing(false);
  };

  const handleRegenerateContent = async () => {
    if (!editedText.trim()) {
      toast({
        title: '내용을 입력해주세요',
        variant: 'destructive',
      });
      return;
    }
    
    if (!sessionId) return;
    
    setIsRegenerating(true);
    
    try {
      // Call process-audio with raw_text (text-only mode)
      const formData = new FormData();
      formData.append('raw_text', editedText.trim());
      formData.append('user_persona', sessionPersona);
      formData.append('user_mood', sessionMood);
      formData.append('session_purpose', sessionPurpose);

      const response = await supabase.functions.invoke('process-audio', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI 처리에 실패했습니다');
      }

      const aiResult = response.data;
      const generatedContent = aiResult.content;

      // Update session raw_text
      const { error: updateSessionError } = await supabase
        .from('sessions')
        .update({ raw_text: editedText.trim() })
        .eq('id', sessionId);
      
      if (updateSessionError) throw updateSessionError;

      // Update existing outputs (not insert new ones)
      const platformMapping: Record<string, string> = {
        blog: generatedContent.blog_content,
        linkedin: generatedContent.linkedin_content,
        reels: generatedContent.reels_content,
        threads: generatedContent.threads_content,
      };

      for (const [platformType, content] of Object.entries(platformMapping)) {
        const { error: updateOutputError } = await supabase
          .from('outputs')
          .update({ generated_content: content })
          .eq('session_id', sessionId)
          .eq('platform_type', platformType);
        
        if (updateOutputError) {
          console.error(`Error updating ${platformType}:`, updateOutputError);
        }
      }

      // Update local state
      setRawText(editedText.trim());
      setOriginalText(editedText.trim());
      setOutputs(prev => prev.map(output => ({
        ...output,
        generated_content: platformMapping[output.platform_type] || output.generated_content
      })));
      setIsEditing(false);
      
      toast({
        title: '재생성 완료!',
        description: '수정된 내용으로 결과가 다시 생성되었습니다.',
      });
    } catch (error) {
      console.error('Error regenerating content:', error);
      toast({
        title: 'AI 처리 또는 저장에 실패했습니다',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Regenerating Overlay */}
      {isRegenerating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">수정한 내용을 기반으로 다시 생성 중입니다...</p>
        </div>
      )}
      
      <div className="flex-1 p-6 py-8">
        <div className="w-full max-w-[430px] mx-auto space-y-6">
          
          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">오늘의 결과</h1>
          </div>

          {/* Original Input Text Section - Editable */}
          <div className="bg-white rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">오늘 내가 기록한 내용</h2>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  className="h-8 text-xs"
                >
                  수정하기
                </Button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[150px] text-sm resize-none"
                  placeholder="수정할 내용을 입력하세요..."
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleKeepOriginal}
                    className="flex-1 h-10 text-sm"
                  >
                    원래 내용 유지하기
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRegenerateContent}
                    disabled={isRegenerating || !editedText.trim()}
                    className="flex-1 h-10 text-sm bg-foreground text-background hover:bg-foreground/90"
                  >
                    수정한 내용으로 다시 생성하기
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {rawText || '기록된 내용이 없습니다.'}
              </p>
            )}
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
      </div>
    </div>
  );
};

export default Results;
