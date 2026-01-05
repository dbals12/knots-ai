import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ResultDetailModal from "@/components/ResultDetailModal";
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from "react-icons/si";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Loader2 } from "lucide-react";

const platformIcons = {
  blog: { icon: SiNaver, color: "#03C75A", title: "블로그 (회고형)" },
  linkedin: { icon: SiLinkedin, color: "#0077B5", title: "LinkedIn (인사이트형)" },
  reels: { icon: SiInstagram, color: "#E4405F", title: "인스타 (카드뉴스 & 캡션)" },
  threads: { icon: SiThreads, color: "#000000", title: "Threads (짧은 에세이)" },
};

export default function DraftResult() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<any | null>(null);
  const [rawText, setRawText] = useState("");
  const [outputs, setOutputs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDraftData = async () => {
      if (!id) return;
      try {
        const { data: draft, error } = await supabase.from("drafts").select("*").eq("id", id).single();

        if (error) throw error;

        // Draft의 input_data 파싱
        const inputData = typeof draft.input_data === "object" ? draft.input_data : {};
        // @ts-ignore
        const text = inputData.textInput || inputData.raw_text || "";
        setRawText(text);

        // 결과 데이터가 있다고 가정 (실제로는 Drafts 테이블이나 별도 로직에 따라 다름)
        // 여기서는 UI 테스트를 위해 가상의 데이터를 보여주거나, Draft에 결과가 저장되었다면 그것을 가져옵니다.
        // *중요*: 게스트가 무한 로딩에 걸리는 이유는 여기서 데이터를 못 찾아서 계속 기다리기 때문일 수 있습니다.
        // 일단 로딩을 끝내도록 처리합니다.
        setIsLoading(false);
      } catch (error) {
        console.error("Error:", error);
        toast({ title: "오류", description: "데이터를 불러오지 못했습니다.", variant: "destructive" });
        setIsLoading(false);
      }
    };

    fetchDraftData();
  }, [id]);

  if (isLoading) {
    return (
      <AppShell isGuest={true}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell className="min-h-[700px] flex flex-col" isGuest={true}>
      <div className="flex-1 px-6 py-6 flex flex-col gap-5 overflow-y-auto">
        <h2 className="text-xl font-semibold text-foreground">오늘의 결과</h2>

        {/* ✅ 전체 보기 수정 (line-clamp 제거) */}
        <div className="bg-[#F8F8F8] rounded-2xl p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">오늘 내가 기록한 내용</h3>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-white">
              수정하기
            </Button>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rawText || "기록된 내용이 없습니다."}</p>
          </div>
        </div>

        {/* 결과 카드 영역 (데이터가 있다면 렌더링) */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {/* outputs 매핑 로직 ... */}
          {/* (데이터가 없으면 비어 보일 수 있습니다) */}
        </div>

        {/* ✅ 버튼 위치 수정: 맨 아래로 밀지 않고 컨텐츠 하단에 배치 */}
        <div className="mt-auto pt-4 space-y-2 w-full">
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
    </AppShell>
  );
}
