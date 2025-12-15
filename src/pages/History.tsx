import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

// Helper to parse Instagram content for preview
const getInstagramPreview = (content: string | null): string => {
  if (!content) return "생성된 콘텐츠 없음";

  // Clean markdown code blocks
  const cleanContent = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(cleanContent);
    if (typeof parsed === "object" && parsed !== null) {
      // Return Slide 1 content as preview
      const slide1 = parsed["Slide 1"] || parsed["slide 1"];
      if (slide1) {
        // Clean any JSON artifacts
        return slide1.replace(/^[:\s"]+|[",\s}]+$/g, "").trim();
      }
    }
  } catch {
    // Not valid JSON, try text format
    const match = content.match(/\[Slide 1\]([\s\S]*?)(?=\[Slide|\[Caption|$)/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return content.substring(0, 100) + "...";
};

const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data && !error) {
        setSessions(data);
      }
      setLoading(false);
    };

    fetchSessions();
  }, [user]);

  const handleSessionClick = async (session: Session) => {
    setSelectedSession(session);

    const { data, error } = await supabase.from("outputs").select("*").eq("session_id", session.id);

    if (data && !error) {
      setOutputs(data);
    }
  };

  const handleOutputClick = (output: Output) => {
    setSelectedOutput(output);
    setIsDetailModalOpen(true);
  };

  const handleContentUpdate = (newContent: string) => {
    if (selectedOutput) {
      // Update the local state
      setOutputs((prev) => prev.map((o) => (o.id === selectedOutput.id ? { ...o, generated_content: newContent } : o)));
      setSelectedOutput((prev) => (prev ? { ...prev, generated_content: newContent } : null));
    }
  };

  const handleCopy = (content: string) => {
    // Copy is handled in the modal, but we can add tracking here if needed
  };

  const handleSave = () => {
    toast({
      title: "저장되었습니다.",
      description: "변경사항이 저장되었습니다.",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
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
        {/* Page Title */}
        <h2 className="text-xl font-semibold text-foreground">내 기록 보기</h2>

        {/* Sessions List */}
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
                {session.session_purpose && (
                  <p className="text-xs text-muted-foreground mb-1">목적: {session.session_purpose}</p>
                )}
                <p className="text-sm text-foreground line-clamp-2">{session.raw_text || "내용 없음"}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">기록 상세</DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4 py-2">
              {/* Date and metadata */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{formatDate(selectedSession.created_at)}</p>
                {selectedSession.session_purpose && (
                  <p className="text-xs text-muted-foreground">목적: {selectedSession.session_purpose}</p>
                )}
              </div>

              {/* Original text */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold mb-2">원본 기록</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedSession.raw_text || "내용 없음"}
                </p>
              </div>

              {/* Platform outputs - Now clickable! */}
              {outputs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold">채널별 결과</h3>
                  <p className="text-xs text-muted-foreground">💡 카드를 클릭하면 전체 내용을 보고 수정할 수 있어요</p>
                  <div className="grid grid-cols-2 gap-2">
                    {outputs.map((output) => {
                      const platformKey = output.platform_type as keyof typeof platformIcons;
                      const { icon: Icon, color } = platformIcons[platformKey] || { icon: SiNaver, color: "#000000" };
                      const isInstagram = platformKey === "reels";
                      const previewContent = isInstagram
                        ? getInstagramPreview(output.generated_content)
                        : output.generated_content || "생성된 콘텐츠 없음";

                      return (
                        <button
                          key={output.id}
                          onClick={() => handleOutputClick(output)}
                          className="bg-muted/50 rounded-xl p-3 text-left hover:bg-muted/70 hover:shadow-md hover:border-foreground/20 border border-transparent transition-all cursor-pointer group"
                        >
                          {platformKey === "reels" ? (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                          ) : (
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                            >
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <p className="text-xs text-foreground font-medium mb-1">
                            {platformKey === "blog"
                              ? "블로그"
                              : platformKey === "linkedin"
                                ? "LinkedIn"
                                : platformKey === "reels"
                                  ? "Instagram"
                                  : "Threads"}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{previewContent}</p>
                          {/* Hover indicator */}
                          <p className="text-[10px] text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            클릭하여 수정 →
                          </p>
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

      {/* Result Detail Modal - Reused from main Result view */}
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
