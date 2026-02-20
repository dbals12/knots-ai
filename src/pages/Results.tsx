import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ResultDetailModal from '@/components/ResultDetailModal';
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppShell from '@/components/AppShell';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import track from '@/lib/track';
import { getSessionId } from '@/lib/session';
import { getAccessToken } from '@/lib/edgeFunctionAuth';

const platformIcons = {
  blog: { icon: SiNaver, color: '#03C75A', title: '블로그 (회고형)' },
  linkedin: { icon: SiLinkedin, color: '#0077B5', title: 'LinkedIn (인사이트형)' },
  reels: { icon: SiInstagram, color: '#E4405F', title: '인스타 (카드뉴스 & 캡션)' },
  threads: { icon: SiThreads, color: '#000000', title: 'Threads (짧은 에세이)' },
};

interface Output {
  id: string;
  platform_type: string;
  generated_content: string | null;
  session_id: string;
}

// ─── 접힘/펼침 가능한 원문 카드 ───
interface ExpandableInputCardProps {
  rawText: string;
  isEditing: boolean;
  editedText: string;
  isRegenerating: boolean;
  onEditToggle: () => void;
  onKeepOriginal: () => void;
  onRegenerate: () => void;
  onEditedTextChange: (v: string) => void;
}

const ExpandableInputCard = ({
  rawText,
  isEditing,
  editedText,
  isRegenerating,
  onEditToggle,
  onKeepOriginal,
  onRegenerate,
  onEditedTextChange,
}: ExpandableInputCardProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-muted/40 rounded-2xl p-3 md:p-4">
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h3 className="text-xs md:text-sm font-medium text-foreground">오늘 내가 기록한 내용</h3>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={onEditToggle} className="h-7 md:h-8 text-xs">
            수정하기
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2 md:space-y-3">
          <Textarea
            value={editedText}
            onChange={(e) => onEditedTextChange(e.target.value)}
            className="min-h-[100px] md:min-h-[120px] text-sm resize-none bg-background"
            placeholder="수정할 내용을 입력하세요..."
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onKeepOriginal} className="flex-1 h-8 text-xs">
              원래 내용 유지
            </Button>
            <Button
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating || !editedText.trim()}
              className="flex-1 h-8 text-xs bg-foreground text-background hover:bg-foreground/90"
            >
              다시 생성하기
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p
            className={`text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ${
              expanded ? '' : 'line-clamp-3 md:line-clamp-4'
            }`}
          >
            {rawText || '기록된 내용이 없습니다.'}
          </p>
          {rawText && rawText.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 flex items-center gap-0.5 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> 접기
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> 더보기
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

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
          
          const { data: outputsData, error: outputsError } = await supabase
            .from('outputs')
            .select('id, platform_type, generated_content, session_id')
            .eq('session_id', sessionData.id);
          
          if (outputsError) throw outputsError;
          
          setOutputs(outputsData || []);
          track.viewResult({
            analytics_session_id: getSessionId(),
            db_session_id: sessionData.id,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({ title: '데이터를 불러올 수 없습니다', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLatestSessionAndOutputs();
  }, [user]);

  const handleCardClick = (output: Output) => {
    setSelectedOutput(output);
    setSelectedPlatform(output.platform_type);
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    
    if (selectedOutput) {
      track.clickCopy(selectedOutput.platform_type, {
        analytics_session_id: getSessionId(),
        db_session_id: sessionId,
      });
      supabase.from('events').insert({
        user_id: user?.id,
        event_type: 'click_copy',
        platform_type: selectedOutput.platform_type,
        analytics_session_id: getSessionId(),
        db_session_id: sessionId,
        metadata: { target_platform: selectedOutput.platform_type, output_id: selectedOutput.id },
      }).then(({ error }) => { if (error) console.error('Event logging error:', error); });
    }
    
    toast({ title: '복사 완료!', description: '클립보드에 복사되었습니다.' });
  };

  const handleSave = () => {};

  const handleContentUpdate = (newContent: string) => {
    if (selectedOutput) {
      setOutputs(prev => prev.map(output => 
        output.id === selectedOutput.id ? { ...output, generated_content: newContent } : output
      ));
      setSelectedOutput(prev => prev ? { ...prev, generated_content: newContent } : null);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) setEditedText(rawText);
    setIsEditing(!isEditing);
  };

  const handleKeepOriginal = () => {
    setEditedText(rawText);
    setIsEditing(false);
  };

  const handleRegenerateContent = async () => {
    if (!editedText.trim()) {
      toast({ title: '내용을 입력해주세요', variant: 'destructive' });
      return;
    }
    if (!sessionId) return;

    const accessToken = await getAccessToken();
    if (!accessToken) {
      toast({ title: '로그인이 필요합니다', description: '다시 로그인해 주세요.', variant: 'destructive' });
      return;
    }
    
    setIsRegenerating(true);
    
    try {
      const formData = new FormData();
      formData.append('raw_text', editedText.trim());
      formData.append('user_persona', sessionPersona);
      formData.append('user_mood', sessionMood);
      formData.append('session_purpose', sessionPurpose);

      const response = await supabase.functions.invoke('process-audio', {
        body: formData,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.error) throw new Error(response.error.message || 'AI 처리에 실패했습니다');

      const aiResult = response.data;
      const generatedContent = aiResult.content;

      await supabase.from('sessions').update({ raw_text: editedText.trim() }).eq('id', sessionId);

      const platformMapping: Record<string, string> = {
        blog: generatedContent.blog_content,
        linkedin: generatedContent.linkedin_content,
        reels: generatedContent.reels_content,
        threads: generatedContent.threads_content,
      };

      for (const [platformType, content] of Object.entries(platformMapping)) {
        await supabase.from('outputs').update({ generated_content: content })
          .eq('session_id', sessionId).eq('platform_type', platformType);
      }

      setRawText(editedText.trim());
      setOriginalText(editedText.trim());
      setOutputs(prev => prev.map(output => ({
        ...output,
        generated_content: platformMapping[output.platform_type] || output.generated_content,
      })));
      setIsEditing(false);
      
      toast({ title: '재생성 완료!', description: '수정된 내용으로 결과가 다시 생성되었습니다.' });
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
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </AppShell>
    );
  }

  const getSummary = (content: string | null) => {
    if (!content) return '콘텐츠가 생성되지 않았습니다.';
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  return (
    <AppShell>
      {/* Regenerating Overlay */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-[28px]">
          <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-foreground mb-4" />
          <p className="text-base md:text-lg font-medium text-foreground text-center px-4">
            수정한 내용을 기반으로 다시 생성 중입니다...
          </p>
        </div>
      )}
      
      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5">
        <h2 className="text-lg md:text-xl font-semibold text-foreground">오늘의 결과</h2>

        {/* 원문 카드: 모바일 접힘/더보기 지원 */}
        <ExpandableInputCard
          rawText={rawText}
          isEditing={isEditing}
          editedText={editedText}
          isRegenerating={isRegenerating}
          onEditToggle={handleEditToggle}
          onKeepOriginal={handleKeepOriginal}
          onRegenerate={handleRegenerateContent}
          onEditedTextChange={setEditedText}
        />

        {/* 반응형 그리드: 모바일 1열 / md 이상 2열 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {outputs.map((output) => {
            const platformKey = output.platform_type as keyof typeof platformIcons;
            const platformInfo = platformIcons[platformKey];
            if (!platformInfo) return null;
            
            const { icon: Icon, color, title } = platformInfo;
            
            return (
              <button
                key={output.id}
                onClick={() => handleCardClick(output)}
                className="bg-muted/40 rounded-2xl p-3 md:p-4 hover:bg-muted/60 transition-all text-left space-y-2"
              >
                {output.platform_type === 'reels' ? (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color }}>
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-foreground text-xs mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                    {getSummary(output.generated_content)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-1 space-y-2">
          <Button 
            onClick={() => navigate('/input')}
            className="w-full h-10 md:h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-sm"
          >
            새로운 기록 만들기
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full h-10 md:h-11 rounded-xl text-sm"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>

      {selectedPlatform && selectedOutput && (
        <ResultDetailModal
          isOpen={!!selectedPlatform}
          onClose={() => { setSelectedPlatform(null); setSelectedOutput(null); }}
          platform={selectedPlatform}
          content={selectedOutput.generated_content || ''}
          outputId={selectedOutput.id}
          onCopy={handleCopy}
          onSave={handleSave}
          onContentUpdate={handleContentUpdate}
        />
      )}
    </AppShell>
  );
};

export default Results;
