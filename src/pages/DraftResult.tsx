import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import ResultDetailModal from "@/components/ResultDetailModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContentData {
  input_text: string;
  result_data: {
    blog_content?: string;
    linkedin_content?: string;
    reels_content?: string;
    threads_content?: string;
  };
}

const platformIcons = {
  blog: { icon: SiNaver, color: "#03C75A", title: "블로그 (회고형)" },
  linkedin: { icon: SiLinkedin, color: "#0077B5", title: "LinkedIn (인사이트형)" },
  reels: { icon: SiInstagram, color: "#E4405F", title: "인스타 (카드뉴스 & 캡션)" },
  threads: { icon: SiThreads, color: "#000000", title: "Threads (짧은 에세이)" },
};

const getSummary = (content: string | null) => {
  if (!content) return "콘텐츠가 생성되지 않았습니다.";
  const cleanContent = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  try {
    const parsed = JSON.parse(cleanContent);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        (parsed["Slide 1"] || parsed["slide 1"] || parsed["Caption"] || parsed["caption"] || content).substring(
          0,
          100,
        ) + "..."
      );
    }
  } catch {}
  return content.length > 100 ? content.substring(0, 100) + "..." : content;
};

const DraftResult = () => {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  // URL에서 타입 확인 (기본값은 draft)
  const isSessionType = new URLSearchParams(location.search).get("type") === "session";

  // 1. 데이터 불러오기 (이원화 전략)
  useEffect(() => {
    if (!draftId) return;

    const fetchData = async () => {
      try {
        let contentData: ContentData | null = null;

        // A. 회원 모드 (sessions + outputs)
        if (isSessionType) {
          const { data: session } = await supabase.from("sessions").select("*").eq("id", draftId).single();
          const { data: outputs } = await supabase.from("outputs").select("*").eq("session_id", draftId);

          if (session && outputs) {
            const result_data: any = {};
            outputs.forEach((o: any) => {
              if (o.platform_type === "blog") result_data.blog_content = o.generated_content;
              if (o.platform_type === "linkedin") result_data.linkedin_content = o.generated_content;
              if (o.platform_type === "reels") result_data.reels_content = o.generated_content;
              if (o.platform_type === "threads") result_data.threads_content = o.generated_content;
            });
            contentData = { input_text: session.raw_text, result_data };
          }
        }
        // B. 게스트 모드 (drafts)
        else {
          const { data: draft } = await supabase.from("drafts").select("*").eq("id", draftId).single();
          if (draft) {
            // ✅ [수정] as any 캐스팅 추가
            const inputData = draft.input_data as any;
            const resultData = draft.result_data as any;

            if (draft.status === "generating" || draft.status === "idle") {
              // AI 처리 대기
            }
            contentData = {
              input_text: inputData?.textInput || "",
              result_data: resultData || {},
            };
          }
        }

        if (contentData) {
          setData(contentData);
          setLoading(false);
        } else if (!isSessionType) {
          // Realtime 구독으로 대기 (게스트 AI 생성 중일 때)
          const channel = supabase
            .channel(`draft-${draftId}`)
            .on(
              "postgres_changes",
              { event: "UPDATE", schema: "public", table: "drafts", filter: `id=eq.${draftId}` },
              (payload: any) => {
                // ✅ [수정] Payload 데이터 캐스팅
                const newResult = payload.new.result_data as any;
                const newInput = payload.new.input_data as any;

                if (newResult) {
                  setData({
                    input_text: newInput?.textInput || "",
                    result_data: newResult,
                  });
                  setLoading(false);
                }
              },
            )
            .subscribe();
          return () => {
            supabase.removeChannel(channel);
          };
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    fetchData();
  }, [draftId, isSessionType]);

  // 2. 데이터 이사 (Migration) 로직 - 로그인 직후 실행
  useEffect(() => {
    const migrateData = async () => {
      const pendingId = localStorage.getItem("pending_draft_id");

      // 로그인했고, 로컬스토리지에 임시 ID가 있고, 현재 그 ID 페이지라면
      if (user && pendingId && pendingId === draftId && !isSessionType) {
        setLoading(true);
        try {
          // (1) drafts에서 데이터 꺼내기
          const { data: draft } = await supabase.from("drafts").select("*").eq("id", pendingId).single();

          if (draft) {
            // ✅ [수정] JSON 타입 에러 방지를 위해 as any 사용
            const inputData = draft.input_data as any;
            const resultData = draft.result_data as any;

            // (2) sessions로 이사
            const { data: session, error: sErr } = await supabase
              .from("sessions")
              .insert({
                user_id: user.id,
                raw_text: inputData.textInput,
                session_purpose: inputData.sessionPurpose,
                selected_mood: inputData.selectedMood,
                selected_persona: inputData.selectedPersona,
                keyword: inputData.keyword,
                entry_source: "web",
                input_type: inputData.inputMode,
              })
              .select()
              .single();

            if (sErr) throw sErr;

            // (3) outputs로 이사
            const outputsToInsert = [];
            const rd = resultData || {}; // ✅ resultData 사용

            if (rd.blog_content)
              outputsToInsert.push({
                session_id: session.id,
                platform_type: "blog",
                generated_content: rd.blog_content,
              });
            if (rd.linkedin_content)
              outputsToInsert.push({
                session_id: session.id,
                platform_type: "linkedin",
                generated_content: rd.linkedin_content,
              });
            if (rd.reels_content)
              outputsToInsert.push({
                session_id: session.id,
                platform_type: "reels",
                generated_content: rd.reels_content,
              });
            if (rd.threads_content)
              outputsToInsert.push({
                session_id: session.id,
                platform_type: "threads",
                generated_content: rd.threads_content,
              });

            if (outputsToInsert.length > 0) {
              await supabase.from("outputs").insert(outputsToInsert);
            }

            // (4) drafts 삭제 & 스토리지 비우기
            await supabase.from("drafts").delete().eq("id", pendingId);
            localStorage.removeItem("pending_draft_id");

            // (5) 세션 모드로 리다이렉트 (새로고침 효과)
            navigate(`/result/${session.id}?type=session`, { replace: true });
          }
        } catch (e) {
          console.error("Migration failed", e);
          setLoading(false);
        }
      }
    };
    migrateData();
  }, [user, draftId, isSessionType]);

  const performLogin = () => {
    navigate(`/login?next=/result/${draftId}?type=draft`);
  };

  const handleEditInput = () => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }
    navigate("/input", { state: { initialText: data?.input_text } });
  };

  const handleCopyAction = (content: string) => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      toast({ title: "복사 완료", description: "클립보드에 복사되었습니다." });
    });
  };

  const handleContentUpdate = async (newContent: string) => {
    if (!selectedPlatform || !data) return;

    // 로컬 상태 업데이트
    const updatedResult = { ...data.result_data };
    if (selectedPlatform === "blog") updatedResult.blog_content = newContent;
    else if (selectedPlatform === "linkedin") updatedResult.linkedin_content = newContent;
    else if (selectedPlatform === "reels") updatedResult.reels_content = newContent;
    else if (selectedPlatform === "threads") updatedResult.threads_content = newContent;

    setData({ ...data, result_data: updatedResult });

    // DB 업데이트 (회원인 경우만 outputs/edits에 저장)
    if (isSessionType && user) {
      await supabase
        .from("outputs")
        .update({ generated_content: newContent })
        .eq("session_id", draftId)
        .eq("platform_type", selectedPlatform);
    }
    // 게스트인 경우 drafts 업데이트
    else {
      await supabase
        .from("drafts")
        .update({ result_data: updatedResult }) // ✅ 타입 에러 없이 업데이트
        .eq("id", draftId);
    }
  };

  const handleCardClick = (platformKey: string) => {
    setSelectedPlatform(platformKey);
    setIsModalOpen(true);
  };

  const getContent = (key: string) => {
    if (!data?.result_data) return "";
    const rd = data.result_data;
    if (key === "blog") return rd.blog_content;
    if (key === "linkedin") return rd.linkedin_content;
    if (key === "reels") return rd.reels_content;
    if (key === "threads") return rd.threads_content;
    return "";
  };

  if (loading || !data) {
    return (
      <AppShell showHeader={false}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell className="min-h-[700px]">
      <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto pb-32">
        <h2 className="text-xl font-semibold text-foreground">오늘의 결과</h2>

        <div className="bg-[#F8F8F8] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">오늘 내가 기록한 내용</h3>
            <Button variant="outline" size="sm" onClick={handleEditInput} className="h-8 text-xs">
              {user ? "수정하기" : "저장"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
            {data.input_text}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.keys(platformIcons).map((key) => {
            const meta = platformIcons[key as keyof typeof platformIcons];
            const Icon = meta.icon;
            const content = getContent(key);

            return (
              <button
                key={key}
                onClick={() => handleCardClick(key)}
                className="bg-[#F8F8F8] rounded-2xl p-4 hover:bg-[#F0F0F0] transition-all text-left space-y-2"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${key === "reels" ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : ""}`}
                  style={{ backgroundColor: key === "reels" ? undefined : meta.color }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-xs mb-1">{meta.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                    {getSummary(content)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8 z-50">
        <div className="max-w-md mx-auto">
          {!user ? (
            <Button
              onClick={() => performLogin()}
              className="w-full h-14 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-base font-bold shadow-lg"
            >
              3초 만에 로그인하고 결과 복사/저장하기
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/input")}
                className="flex-1 h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                새로운 기록 만들기
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="flex-1 h-12 rounded-xl">
                홈으로 돌아가기
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showLoginAlert} onOpenChange={setShowLoginAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>로그인이 필요한 기능입니다</AlertDialogTitle>
            <AlertDialogDescription>
              결과를 저장하거나 복사하려면 로그인이 필요해요.
              <br />
              3초 만에 로그인하고 안전하게 보관하세요!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-0">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={performLogin}
              className="rounded-xl bg-[#FEE500] text-black hover:bg-[#FEE500]/90"
            >
              카카오/구글로 시작하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedPlatform && (
        <ResultDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPlatform(null);
          }}
          platform={selectedPlatform}
          content={getContent(selectedPlatform) || ""}
          outputId={draftId || ""}
          isGuest={!user}
          isDraftMode={!isSessionType}
          onSave={() => (user ? null : setShowLoginAlert(true))}
          onCopy={(content) => handleCopyAction(content)}
          onContentUpdate={handleContentUpdate}
        />
      )}
    </AppShell>
  );
};

export default DraftResult;
