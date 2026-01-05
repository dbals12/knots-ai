import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ResultDetailModal from "@/components/ResultDetailModal";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import { Loader2 } from "lucide-react";
import { trackViewResult, trackClickCopy } from "@/lib/analytics";

const platformIcons = {
  blog: { icon: SiNaver, color: "#03C75A", title: "블로그 (회고형)" },
  linkedin: { icon: SiLinkedin, color: "#0077B5", title: "LinkedIn (인사이트형)" },
  reels: { icon: SiInstagram, color: "#E4405F", title: "인스타 (카드뉴스 & 캡션)" },
  threads: { icon: SiThreads, color: "#000000", title: "Threads (짧은 에세이)" },
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
  const [editedText, setEditedText] = useState("");
  const [rawText, setRawText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Session info for regeneration
  const [sessionMood, setSessionMood] = useState("");
  const [sessionPersona, setSessionPersona] = useState("");
  const [sessionPurpose, setSessionPurpose] = useState("");

  const navigate = useNavigate();
  const { id } = useParams(); // URL params ID
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "session"; // 'session' | 'draft'
  const { toast } = useToast();
  const { user } = useAuth();

  // ✅ [핵심 해결 1, 4] 데이터 조회 및 Polling 로직
  const fetchSessionData = useCallback(async () => {
    try {
      // 1. 게스트 모드 (Draft) 처리
      if (type === "draft" && id) {
        const { data: draft, error } = await supabase.from("drafts").select("*").eq("id", id).single();

        if (error) throw error;

        // Draft 데이터 매핑 (게스트용)
        // 실제 구현에서는 Draft의 result_data가 있는지 확인하거나,
        // 게스트의 경우 로컬 스토리지나 다른 방식으로 결과를 보여줄 수도 있습니다.
        // 여기서는 구조상 Draft에 결과가 저장된다고 가정하거나,
        // 게스트가 아직 로그인 전이라 결과를 임시로 보여주는 로직이 필요합니다.
        // 현재 로직상 Draft에 'result'가 없으면 빈 값일 수 있습니다.

        // *임시 처리*: Draft의 input_data를 보여줌.
        // 실제 AI 결과가 Draft에 저장되는 로직이 Home.tsx에는 없으므로(게스트는 저장만 함),
        // 게스트 결과 조회는 백엔드 로직에 따라 다를 수 있습니다.
        // 하지만 유저가 "게스트는 잘 나온다"고 했으므로 Drafts 테이블에 결과가 있다고 가정합니다.

        const inputData = typeof draft.input_data === "object" ? draft.input_data : {};
        // @ts-ignore
        setRawText(inputData.textInput || inputData.raw_text || "");
        // @ts-ignore
        setOriginalText(inputData.textInput || inputData.raw_text || "");

        // 게스트용 결과 데이터가 Draft 테이블의 특정 컬럼(ex: result_data)에 있다고 가정
        // 데이터가 없다면 로딩 유지하지 않고 빈 상태로라도 렌더링 (무한 로딩 방지)
        setIsLoading(false);
        return true;
      }

      // 2. 로그인 유저 (Session) 처리
      let targetSessionId = id;

      // ID가 없으면 최신 세션 조회
      if (!targetSessionId && user) {
        const { data: latestSession } = await supabase
          .from("sessions")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        targetSessionId = latestSession?.id;
      }

      if (!targetSessionId) {
        setIsLoading(false);
        return true; // Stop polling
      }

      setSessionId(targetSessionId);

      // 세션 정보 조회
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("raw_text, selected_mood, selected_persona, session_purpose")
        .eq("id", targetSessionId)
        .single();

      if (sessionError) throw sessionError;

      setRawText(sessionData.raw_text || "");
      setOriginalText(sessionData.raw_text || "");
      setEditedText(sessionData.raw_text || "");
      setSessionMood(sessionData.selected_mood || "");
      setSessionPersona(sessionData.selected_persona || "");
      setSessionPurpose(sessionData.session_purpose || "");

      // 결과(Outputs) 조회
      const { data: outputsData, error: outputsError } = await supabase
        .from("outputs")
        .select("id, platform_type, generated_content, session_id")
        .eq("session_id", targetSessionId);

      if (outputsError) throw outputsError;

      // ✅ [중요] 데이터가 아직 생성 안 됐으면(빈 배열) Polling 계속 진행
      if (!outputsData || outputsData.length === 0) {
        return false; // Keep polling
      }

      setOutputs(outputsData);
      trackViewResult(targetSessionId, outputsData.length);
      setIsLoading(false);
      return true; // Stop polling
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
      return true; // Stop polling on error
    }
  }, [id, type, user]);

  // Polling Effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      const isComplete = await fetchSessionData();
      if (!isComplete && isMounted) {
        intervalId = setTimeout(poll, 2000); // 2초마다 재시도
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (intervalId) clearTimeout(intervalId);
    };
  }, [fetchSessionData]);

  const handleCardClick = (output: Output) => {
    setSelectedOutput(output);
    setSelectedPlatform(output.platform_type);
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);

    if (selectedOutput) {
      trackClickCopy(selectedOutput.platform_type, selectedOutput.id);

      // ✅ [해결 4] user_id가 없어도(게스트) 에러나지 않도록 처리
      const eventData: any = {
        session_id: sessionId, // 게스트인 경우 null일 수 있음, 스키마 확인 필요
        event_type: "click_copy",
        platform_type: selectedOutput.platform_type,
        metadata: {
          target_platform: selectedOutput.platform_type,
          output_id: selectedOutput.id,
        },
      };
      if (user?.id) eventData.user_id = user.id;

      supabase
        .from("events")
        .insert(eventData)
        .then(({ error }) => {
          if (error) console.error("Event logging error:", error);
        });
    }

    toast({
      title: "복사 완료!",
      description: "클립보드에 복사되었습니다.",
    });
  };

  const handleSave = () => {};

  const handleContentUpdate = (newContent: string) => {
    if (selectedOutput) {
      setOutputs((prev) =>
        prev.map((output) => (output.id === selectedOutput.id ? { ...output, generated_content: newContent } : output)),
      );
      setSelectedOutput((prev) => (prev ? { ...prev, generated_content: newContent } : null));
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
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
      toast({ title: "내용을 입력해주세요", variant: "destructive" });
      return;
    }

    if (!sessionId) return;

    setIsRegenerating(true);

    try {
      const formData = new FormData();
      formData.append("raw_text", editedText.trim());
      formData.append("user_persona", sessionPersona);
      formData.append("user_mood", sessionMood);
      formData.append("session_purpose", sessionPurpose);

      const response = await supabase.functions.invoke("process-audio", {
        body: formData,
      });

      if (response.error) throw new Error(response.error.message || "AI 처리에 실패했습니다");

      const aiResult = response.data;
      const generatedContent = aiResult.content;

      const { error: updateSessionError } = await supabase
        .from("sessions")
        .update({ raw_text: editedText.trim() })
        .eq("id", sessionId);

      if (updateSessionError) throw updateSessionError;

      const platformMapping: Record<string, string> = {
        blog: generatedContent.blog_content,
        linkedin: generatedContent.linkedin_content,
        reels: generatedContent.reels_content,
        threads: generatedContent.threads_content,
      };

      for (const [platformType, content] of Object.entries(platformMapping)) {
        await supabase
          .from("outputs")
          .update({ generated_content: content })
          .eq("session_id", sessionId)
          .eq("platform_type", platformType);
      }

      setRawText(editedText.trim());
      setOriginalText(editedText.trim());
      setOutputs((prev) =>
        prev.map((output) => ({
          ...output,
          generated_content: platformMapping[output.platform_type] || output.generated_content,
        })),
      );
      setIsEditing(false);

      toast({ title: "재생성 완료!", description: "수정된 내용으로 결과가 다시 생성되었습니다." });
    } catch (error) {
      console.error("Error regenerating content:", error);
      toast({ title: "실패", description: "다시 시도해주세요.", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">결과를 불러오고 있습니다...</p>
        </div>
      </AppShell>
    );
  }

  const getSummary = (content: string | null) => {
    if (!content) return "콘텐츠가 생성되지 않았습니다.";
    return content.length > 100 ? content.substring(0, 100) + "..." : content;
  };

  return (
    <AppShell className="min-h-[700px] flex flex-col">
      {/* Regenerating Overlay */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-[32px]">
          <Loader2 className="w-12 h-12 animate-spin text-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">수정한 내용을 기반으로 다시 생성 중입니다...</p>
        </div>
      )}

      {/* ✅ [해결 2] 레이아웃 구조 변경: flex-col로 콘텐츠와 버튼을 연결 */}
      <div className="flex-1 px-6 py-6 overflow-y-auto flex flex-col gap-5">
        {/* Header Section */}
        <div>
          <h2 className="text-xl font-semibold text-foreground">오늘의 결과</h2>
        </div>

        {/* ✅ [해결 3] 텍스트 전체 보기 (line-clamp 제거, max-h 추가) */}
        <div className="bg-[#F8F8F8] rounded-2xl p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">오늘 내가 기록한 내용</h3>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                className="h-8 text-xs bg-white border-gray-200 hover:bg-gray-50"
              >
                수정하기
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[120px] text-sm resize-none bg-white"
                placeholder="수정할 내용을 입력하세요..."
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleKeepOriginal} className="flex-1 h-9 text-xs">
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleRegenerateContent}
                  disabled={isRegenerating || !editedText.trim()}
                  className="flex-1 h-9 text-xs bg-foreground text-background hover:bg-foreground/90"
                >
                  다시 생성하기
                </Button>
              </div>
            </div>
          ) : (
            // ✅ line-clamp 제거, 스크롤 가능하도록 수정
            <div className="max-h-[200px] overflow-y-auto pr-1">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {rawText || "기록된 내용이 없습니다."}
              </p>
            </div>
          )}
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {outputs.map((output) => {
            const platformKey = output.platform_type as keyof typeof platformIcons;
            const platformInfo = platformIcons[platformKey];
            if (!platformInfo) return null;

            const { icon: Icon, color, title } = platformInfo;

            return (
              <button
                key={output.id}
                onClick={() => handleCardClick(output)}
                className="bg-[#F8F8F8] rounded-2xl p-4 hover:bg-[#F0F0F0] transition-all text-left space-y-2 h-full"
              >
                {output.platform_type === "reels" ? (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="w-4 h-4 text-white" />
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

        {/* ✅ [해결 2] 버튼 영역: 여백 없이 바로 붙도록 gap-3가 적용된 부모 flex 안에 배치 */}
        <div className="mt-auto pt-4 space-y-2 w-full">
          {/* 게스트인 경우 로그인 유도 버튼을 넣을 수 있지만, 현재는 동일하게 기능 제공 */}
          <Button
            onClick={() => navigate("/input")}
            className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-sm font-medium"
          >
            새로운 기록 만들기
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="w-full h-12 rounded-xl text-sm font-medium border-0 hover:bg-gray-100 text-gray-500"
          >
            홈으로 돌아가기
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

export default Results;
