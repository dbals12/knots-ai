import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import AppShell from "@/components/AppShell";
import ResultDetailModal from "@/components/ResultDetailModal";
import { useToast } from "@/hooks/use-toast";

const platformIcons = {
  blog: { icon: SiNaver, color: "#03C75A" },
  linkedin: { icon: SiLinkedin, color: "#0077B5" },
  reels: { icon: SiInstagram, color: "#E4405F" },
  threads: { icon: SiThreads, color: "#000000" },
};

// Drafts 테이블 구조에 맞춘 인터페이스
interface Session {
  id: string;
  created_at: string;
  input_data: {
    textInput?: string;
    sessionPurpose?: string;
    keyword?: string;
  } | null;
  result_data: {
    blog_content?: string;
    linkedin_content?: string;
    reels_content?: string;
    threads_content?: string;
  } | null;
}

interface Output {
  id: string;
  platform_type: string;
  generated_content: string | null;
}

const getInstagramPreview = (content: string | null): string => {
  if (!content) return "생성된 콘텐츠 없음";
  const cleanContent = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  try {
    const parsed = JSON.parse(cleanContent);
    if (typeof parsed === "object" && parsed !== null) {
      const slide1 = parsed["Slide 1"] || parsed["slide 1"];
      if (slide1) return slide1.replace(/^[:\s"]+|[",\s}]+$/g, "").trim();
    }
  } catch {
    const match = content.match(/\[Slide 1\]([\s\S]*?)(?=\[Slide|\[Caption|$)/i);
    if (match?.[1]) return match[1].trim();
  }
  return content.substring(0, 100) + "...";
};

const History = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);

  // State for detail modal
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;

      setLoading(true);

      // sessions 테이블에서 raw_text 포함하여 조회
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("id, created_at, raw_text, input_type, session_purpose, keyword")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
      }

      // drafts도 함께 조회 (session_id로 연결 가능)
      const { data: draftsData, error: draftsError } = await supabase
        .from("drafts")
        .select("id, created_at, input_data, result_data, session_id, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (draftsError) {
        console.error("Error fetching drafts:", draftsError);
      }

      // sessions 기반으로 매핑, drafts fallback 포함
      const draftsBySessionId = new Map<string, any>();
      (draftsData || []).forEach((d: any) => {
        if (d.session_id) draftsBySessionId.set(d.session_id, d);
      });

      const merged: Session[] = (sessionsData || []).map((s: any) => {
        const linkedDraft = draftsBySessionId.get(s.id);
        const draftInput = linkedDraft?.input_data || {};
        const draftResult = linkedDraft?.result_data || {};

        return {
          id: s.id,
          created_at: s.created_at,
          input_data: {
            textInput: s.raw_text || draftInput.textInput || draftResult.transcript || undefined,
            sessionPurpose: s.session_purpose || draftInput.sessionPurpose || undefined,
            keyword: s.keyword || draftInput.keyword || undefined,
          },
          result_data: draftResult,
        };
      });

      setSessions(merged);
      setLoading(false);
    };

    fetchSessions();
  }, [user]);

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);

    const result = session.result_data || {};
    const newOutputs: Output[] = [
      { id: `${session.id}-blog`, platform_type: "blog", generated_content: result.blog_content || null },
      { id: `${session.id}-linkedin`, platform_type: "linkedin", generated_content: result.linkedin_content || null },
      { id: `${session.id}-reels`, platform_type: "reels", generated_content: result.reels_content || null },
      { id: `${session.id}-threads`, platform_type: "threads", generated_content: result.threads_content || null },
    ].filter((o) => o.generated_content !== null);

    setOutputs(newOutputs);
  };

  const handleOutputClick = (output: Output) => {
    setSelectedOutput(output);
    setIsDetailModalOpen(true);
  };

  const handleContentUpdate = (newContent: string) => {
    if (selectedOutput) {
      setOutputs((prev) => prev.map((o) => (o.id === selectedOutput.id ? { ...o, generated_content: newContent } : o)));
      setSelectedOutput((prev) => (prev ? { ...prev, generated_content: newContent } : null));
    }
  };

  const handleCopy = () => {
    /* ... */
  };

  const handleSave = () => {
    toast({ title: "저장되었습니다.", description: "변경사항이 저장되었습니다." });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
        <h2 className="text-xl font-semibold text-foreground">내 기록 보기</h2>

        {sessions.length === 0 ? (
          <div className="bg-muted/50 rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">아직 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="w-full bg-muted/50 rounded-2xl p-4 hover:bg-muted/70 transition-all text-left"
              >
                <p className="text-xs text-muted-foreground mb-2">{formatDate(session.created_at)}</p>
                {session.input_data?.sessionPurpose && (
                  <p className="text-xs text-muted-foreground mb-1">목적: {session.input_data.sessionPurpose}</p>
                )}
                <p className="text-sm text-foreground line-clamp-2">
                  {session.input_data?.textInput || "(입력 데이터 없음)"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">기록 상세</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{formatDate(selectedSession.created_at)}</p>
                {selectedSession.input_data?.sessionPurpose && (
                  <p className="text-xs text-muted-foreground">목적: {selectedSession.input_data.sessionPurpose}</p>
                )}
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold mb-2">원본 기록</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedSession.input_data?.textInput || "(입력 데이터 없음)"}
                </p>
              </div>
              {outputs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold">채널별 결과</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {outputs.map((output) => {
                      const platformKey = output.platform_type as keyof typeof platformIcons;
                      const { icon: Icon, color } = platformIcons[platformKey] || { icon: SiNaver, color: "#000000" };
                      const isInstagram = platformKey === "reels";
                      const previewContent = isInstagram
                        ? getInstagramPreview(output.generated_content)
                        : output.generated_content || "없음";

                      return (
                        <button
                          key={output.id}
                          onClick={() => handleOutputClick(output)}
                          className="bg-muted/50 rounded-xl p-3 text-left hover:bg-muted/70 transition-all cursor-pointer group"
                        >
                          {/* ✅ 수정된 부분: className을 하나로 합쳤습니다 */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${platformKey === "reels" ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : ""}`}
                            style={{ backgroundColor: platformKey === "reels" ? undefined : color }}
                          >
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <p className="text-xs text-foreground font-medium mb-1">{platformKey}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{previewContent}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedOutput && (
        <ResultDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOutput(null);
          }}
          platform={selectedOutput.platform_type}
          content={selectedOutput.generated_content || ""}
          outputId={selectedOutput.id}
          onCopy={handleCopy}
          onSave={handleSave}
          onContentUpdate={handleContentUpdate}
        />
      )}
    </AppShell>
  );
};

export default History;
