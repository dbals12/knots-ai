import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';
import AppShell from '@/components/AppShell';


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
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell className="min-h-[700px]">
      <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">
        {/* Page Title */}
        <h2 className="text-xl font-bold text-foreground">내 기록 보기</h2>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-[#F8F8F8] rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">
              아직 기록이 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="w-full bg-[#F8F8F8] rounded-2xl p-4 hover:bg-[#F0F0F0] transition-all text-left"
              >
                <p className="text-xs text-muted-foreground mb-2">
                  {formatDate(session.created_at)}
                </p>
                {session.session_purpose && (
                  <p className="text-xs text-muted-foreground mb-1">
                    목적: {session.session_purpose}
                  </p>
                )}
                <p className="text-sm text-foreground line-clamp-2">
                  {session.raw_text || '내용 없음'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">기록 상세</DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-4 py-2">
              {/* Date and metadata */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {formatDate(selectedSession.created_at)}
                </p>
                {selectedSession.session_purpose && (
                  <p className="text-xs text-muted-foreground">
                    목적: {selectedSession.session_purpose}
                  </p>
                )}
              </div>

              {/* Original text */}
              <div className="bg-[#F8F8F8] rounded-xl p-4">
                <h3 className="text-xs font-bold mb-2">원본 기록</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedSession.raw_text || '내용 없음'}
                </p>
              </div>

              {/* Platform outputs */}
              {outputs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold">채널별 결과</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {outputs.map((output) => {
                      const platformKey = output.platform_type as keyof typeof platformIcons;
                      const { icon: Icon, color } = platformIcons[platformKey] || { icon: SiNaver, color: '#000000' };
                      
                      return (
                        <div
                          key={output.id}
                          className="bg-[#F8F8F8] rounded-xl p-3"
                        >
                          {platformKey === 'reels' ? (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center mb-2">
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                          ) : (
                            <div 
                              className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                              style={{ backgroundColor: color }}
                            >
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <p className="text-xs text-foreground font-medium mb-1">
                            {platformKey === 'blog' ? '블로그' : 
                             platformKey === 'linkedin' ? 'LinkedIn' : 
                             platformKey === 'reels' ? 'Instagram' : 
                             'Threads'}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
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
    </AppShell>
  );
};

export default History;
