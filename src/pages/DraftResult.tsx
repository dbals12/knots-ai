import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, Save, RefreshCw } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";
import type { Json } from "@/integrations/supabase/types";

interface DraftInputData {
  raw_text?: string;
  audio_url?: string;
  selected_mood?: string;
  selected_persona?: string;
  keyword?: string;
  input_type?: string;
  entry_source?: string;
  device_type?: string;
  session_purpose?: string;
  user_persona_label?: string;
  user_mood_label?: string;
  session_purpose_label?: string;
}

interface DraftResultData {
  transcript?: string;
  content?: {
    blog_content?: string;
    linkedin_content?: string;
    reels_content?: string;
    threads_content?: string;
  };
}

interface Draft {
  id: string;
  user_id: string | null;
  status: string;
  input_data: DraftInputData | null;
  result_data: DraftResultData | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const platformConfig = {
  blog: { label: "블로그", color: "bg-blue-500" },
  linkedin: { label: "LinkedIn", color: "bg-sky-600" },
  reels: { label: "Reels", color: "bg-pink-500" },
  threads: { label: "Threads", color: "bg-gray-800" },
};

const DraftResult = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const generationTriggeredRef = useRef(false);
  const claimTriggeredRef = useRef(false);

  // Fetch draft on mount
  useEffect(() => {
    if (!draftId) {
      navigate("/", { replace: true });
      return;
    }

    const fetchDraft = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("drafts")
        .select("*")
        .eq("id", draftId)
        .maybeSingle();

      if (error || !data) {
        console.error("[DraftResult] Failed to fetch draft:", error);
        toast({
          title: "결과를 찾을 수 없습니다",
          description: "잘못된 링크이거나 삭제된 결과입니다.",
          variant: "destructive",
        });
        navigate("/", { replace: true });
        return;
      }

      // Parse JSON fields safely
      const parsedDraft: Draft = {
        ...data,
        input_data: data.input_data as DraftInputData | null,
        result_data: data.result_data as DraftResultData | null,
      };

      setDraft(parsedDraft);
      setLoading(false);
    };

    fetchDraft();
  }, [draftId, navigate, toast]);

  // Trigger generation if status is idle
  useEffect(() => {
    if (!draft || generationTriggeredRef.current) return;
    if (draft.status !== "idle") return;

    generationTriggeredRef.current = true;
    triggerGeneration();
  }, [draft]);

  // Claim draft after login
  useEffect(() => {
    if (authLoading || !user || !draft) return;
    if (claimTriggeredRef.current) return;
    if (draft.user_id !== null) return; // Already claimed

    claimTriggeredRef.current = true;
    claimDraft();
  }, [authLoading, user, draft]);

  const triggerGeneration = async () => {
    if (!draft || !draftId) return;

    setGenerating(true);

    try {
      // Update status to generating
      await supabase
        .from("drafts")
        .update({ status: "generating", updated_at: new Date().toISOString() })
        .eq("id", draftId);

      setDraft((prev) => (prev ? { ...prev, status: "generating" } : prev));

      const inputData = draft.input_data;
      if (!inputData) throw new Error("Input data is missing");

      // Call the AI processing edge function
      const formData = new FormData();

      if (inputData.raw_text) {
        formData.append("raw_text", inputData.raw_text);
      }

      formData.append("user_persona", inputData.user_persona_label || inputData.selected_persona || "");
      formData.append("user_mood", inputData.user_mood_label || inputData.selected_mood || "");
      formData.append("session_purpose", inputData.session_purpose_label || inputData.session_purpose || "");

      const response = await fetch(
        `https://qdzhwrcanenolbocysmx.supabase.co/functions/v1/process-audio`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as any)?.error || "AI processing failed");
      }

      const aiResult = await response.json();
      const { transcript, content } = aiResult;

      const resultData: DraftResultData = {
        transcript,
        content: {
          blog_content: content.blog_content,
          linkedin_content: content.linkedin_content,
          reels_content: content.reels_content,
          threads_content: content.threads_content,
        },
      };

      // Update draft with result
      const { error: updateError } = await supabase
        .from("drafts")
        .update({
          status: "completed",
          result_data: resultData as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId);

      if (updateError) throw updateError;

      setDraft((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              result_data: resultData,
            }
          : prev
      );

      console.log("[DraftResult] Generation completed successfully");
    } catch (err) {
      console.error("[DraftResult] Generation failed:", err);

      await supabase
        .from("drafts")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId);

      setDraft((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              error_message: err instanceof Error ? err.message : "Unknown error",
            }
          : prev
      );

      toast({
        title: "생성에 실패했습니다",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const claimDraft = async () => {
    if (!user || !draft || !draftId) return;
    if (draft.user_id !== null) return;

    setClaiming(true);

    try {
      const { error } = await supabase
        .from("drafts")
        .update({ user_id: user.id, updated_at: new Date().toISOString() })
        .eq("id", draftId)
        .is("user_id", null);

      if (error) throw error;

      setDraft((prev) => (prev ? { ...prev, user_id: user.id } : prev));

      // Clear pending draft from localStorage
      try {
        localStorage.removeItem("pending_draft_id");
      } catch {}

      toast({
        title: "저장 완료",
        description: "결과가 내 계정에 저장되었습니다.",
      });

      console.log("[DraftResult] Draft claimed successfully");
    } catch (err) {
      console.error("[DraftResult] Failed to claim draft:", err);
      toast({
        title: "저장에 실패했습니다",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleLoginToSave = async (provider: "google" | "kakao") => {
    setLoginLoading(true);

    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/result/${draftId}`)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
      setLoginLoading(false);
    }
  };

  const handleCopy = async (platform: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
      toast({
        title: "복사 완료",
        description: "클립보드에 복사되었습니다.",
      });
    } catch {
      toast({
        title: "복사 실패",
        description: "클립보드에 복사할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    generationTriggeredRef.current = false;
    setDraft((prev) => (prev ? { ...prev, status: "idle", error_message: null } : prev));
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Generating state
  if (draft?.status === "idle" || draft?.status === "generating" || generating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <h2 className="text-xl font-semibold text-foreground">콘텐츠 생성 중...</h2>
          <p className="text-muted-foreground">
            AI가 입력하신 내용을 분석하고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
      </div>
    );
  }

  // Failed state
  if (draft?.status === "failed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">생성에 실패했습니다</h2>
          <p className="text-muted-foreground">{draft.error_message || "알 수 없는 오류가 발생했습니다."}</p>
          <Button onClick={handleRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // Completed state - show results
  const resultContent = draft?.result_data?.content;
  const showLoginButton = !user || draft?.user_id === null;
  const isClaimed = draft?.user_id !== null && draft?.user_id === user?.id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">생성된 콘텐츠</h1>
          {isClaimed && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              저장됨
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Login to Save Banner */}
        {showLoginButton && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Save className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">결과를 저장하세요</h3>
                <p className="text-sm text-muted-foreground">
                  로그인하면 이 결과를 계정에 저장하고 나중에 다시 볼 수 있습니다.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 bg-white hover:bg-gray-50 text-gray-900 border-gray-300 gap-2"
                onClick={() => handleLoginToSave("google")}
                disabled={loginLoading || claiming}
              >
                <FcGoogle className="w-5 h-5" />
                Google로 저장
              </Button>
              <Button
                className="flex-1 h-11 text-black hover:bg-[#FEE500]/90 gap-2"
                style={{ backgroundColor: "#FEE500" }}
                onClick={() => handleLoginToSave("kakao")}
                disabled={loginLoading || claiming}
              >
                <RiKakaoTalkFill className="w-5 h-5" />
                Kakao로 저장
              </Button>
            </div>
          </div>
        )}

        {/* Transcript */}
        {draft?.result_data?.transcript && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">원본 내용</h3>
            <p className="text-foreground whitespace-pre-wrap">{draft.result_data.transcript}</p>
          </div>
        )}

        {/* Generated Content Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {resultContent &&
            Object.entries(platformConfig).map(([platform, config]) => {
              const content = resultContent[`${platform}_content` as keyof typeof resultContent];
              if (!content) return null;

              return (
                <div key={platform} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className={`${config.color} px-4 py-2 flex items-center justify-between`}>
                    <span className="text-white font-medium">{config.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 h-8 px-2"
                      onClick={() => handleCopy(platform, content)}
                    >
                      {copiedPlatform === platform ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <p className="text-foreground text-sm whitespace-pre-wrap">{content}</p>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/input")}>
            새로 만들기
          </Button>
          {user && (
            <Button variant="outline" className="flex-1" onClick={() => navigate("/history")}>
              히스토리
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default DraftResult;
