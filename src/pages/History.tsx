import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';
import { ArrowLeft } from 'lucide-react';

const platformIcons = {
  blog: { icon: SiNaver, color: '#03C75A' },
  linkedin: { icon: SiLinkedin, color: '#0077B5' },
  reels: { icon: SiInstagram, color: '#E4405F' },
  threads: { icon: SiThreads, color: '#000000' },
};

interface Session {
  id: string;
  created_at: string;
  raw_text: string | null;
  session_purpose: string | null;
  keyword: string | null;
}

interface Output {
  id: string;
  platform_type: string;
  generated_content: string | null;
}

const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data && !error) {
        setSessions(data);
      }
      setLoading(false);
    };
    
    fetchSessions();
  }, [user]);

  const handleSessionClick = async (session: Session) => {
    setSelectedSession(session);
    
    // Fetch outputs for this session
    const { data, error } = await supabase
      .from('outputs')
      .select('*')
      .eq('session_id', session.id);
    
    if (data && !error) {
      setOutputs(data);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 py-8">
      <div className="w-full max-w-[430px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">내 기록 보기</h1>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                아직 기록이 없습니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => handleSessionClick(session)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-normal text-muted-foreground mb-2">
                        {formatDate(session.created_at)}
                      </CardTitle>
                      {session.session_purpose && (
                        <p className="text-xs text-muted-foreground mb-2">
                          목적: {session.session_purpose}
                        </p>
                      )}
                      {session.keyword && (
                        <p className="text-xs text-muted-foreground mb-2">
                          키워드: {session.keyword}
                        </p>
                      )}
                      <p className="text-sm text-foreground line-clamp-2">
                        {session.raw_text || '내용 없음'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">
                      자세히 보기
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>기록 상세</DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6 py-4">
              {/* Date and metadata */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedSession.created_at)}
                </p>
                {selectedSession.session_purpose && (
                  <p className="text-xs text-muted-foreground">
                    목적: {selectedSession.session_purpose}
                  </p>
                )}
                {selectedSession.keyword && (
                  <p className="text-xs text-muted-foreground">
                    키워드: {selectedSession.keyword}
                  </p>
                )}
              </div>

              {/* Original text */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-bold mb-2">원본 기록</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedSession.raw_text || '내용 없음'}
                </p>
              </div>

              {/* Platform outputs */}
              {outputs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold">채널별 결과</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {outputs.map((output) => {
                      const platformKey = output.platform_type as keyof typeof platformIcons;
                      const { icon: Icon, color } = platformIcons[platformKey] || { icon: SiNaver, color: '#000000' };
                      
                      return (
                        <div
                          key={output.id}
                          className="bg-white rounded-xl p-3 border border-border"
                        >
                          {platformKey === 'reels' ? (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center mb-2">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                              style={{ backgroundColor: color }}
                            >
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <p className="text-xs text-foreground font-medium mb-1">
                            {platformKey === 'blog' ? '블로그' : 
                             platformKey === 'linkedin' ? 'LinkedIn' : 
                             platformKey === 'reels' ? 'Reels' : 
                             'Threads'}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {output.generated_content || '생성된 콘텐츠 없음'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;
