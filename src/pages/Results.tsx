import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import ResultDetailModal from '@/components/ResultDetailModal';
import { SiNaver, SiLinkedin, SiInstagram, SiThreads } from 'react-icons/si';

const platformIcons = {
  blog: { icon: SiNaver, color: '#03C75A' },
  linkedin: { icon: SiLinkedin, color: '#0077B5' },
  reels: { icon: SiInstagram, color: '#E4405F' },
  threads: { icon: SiThreads, color: '#000000' },
};

const mockResults = {
  blog: {
    id: '1',
    title: '블로그 (회고형)',
    platform: 'blog',
    content: `오늘 하루를 돌아보며

클라이언트 미팅에서 예상치 못한 질문들이 쏟아졌다. 순간 당황했지만, 팀원들과 함께 차근차근 설명하면서 오히려 우리 제품의 강점을 더 명확하게 전달할 수 있었다.

이번 경험을 통해 배운 것은 완벽한 준비보다 유연한 대응이 더 중요하다는 것이다. 예상 질문 리스트를 만드는 것도 좋지만, 현장에서의 순발력과 팀워크가 결국 성공의 열쇠였다.

다음 미팅에는 이 경험을 바탕으로 더 자신감 있게 임할 수 있을 것 같다.`,
    summary: '오늘 클라이언트 미팅에서 예상치 못한 질문들이 쏟아졌지만, 팀원들과 함께 차근차근 대응하면서 오히려 제품의 강점을 더 명확하게...',
  },
  linkedin: {
    id: '2',
    title: 'LinkedIn (인사이트형)',
    platform: 'linkedin',
    content: `💡 완벽한 준비보다 유연한 대응

오늘 클라이언트 미팅에서 배운 3가지:

1️⃣ 예상치 못한 질문은 위기가 아닌 기회
→ 우리 제품의 강점을 다른 각도로 설명할 수 있었음

2️⃣ 팀워크가 개인 역량보다 강력하다
→ 각자의 전문성이 모여 더 탄탄한 답변 완성

3️⃣ 현장 순발력이 실전의 핵심
→ 100페이지 기획서보다 10분의 진솔한 대화

여러분은 예상치 못한 상황에서 어떻게 대응하시나요?

#커리어성장 #팀워크 #비즈니스인사이트`,
    summary: '완벽한 준비보다 유연한 대응. 오늘 클라이언트 미팅에서 배운 3가지 인사이트를 공유합니다. 예상치 못한 질문은 위기가 아닌...',
  },
  reels: {
    id: '3',
    title: 'Reels (대본)',
    platform: 'reels',
    content: `[Opening - 3초]
(클로즈업, 진지한 표정)
"클라이언트 미팅에서 이런 질문 받으면 어떡하죠?"

[Hook - 5초]
(화면 전환, 텍스트 오버레이)
"예상 질문 100개 준비했는데
정작 나온 건 101번째 질문"

[Body - 15초]
(빠른 컷 편집)
✅ 당황했지만
✅ 팀원들과 협력
✅ 오히려 제품 강점 부각

(텍스트)
"완벽한 준비 < 유연한 대응"

[CTA - 2초]
"미팅 꿀팁 더 보려면 팔로우👆"

#커리어 #직장인 #업무노하우`,
    summary: '클라이언트 미팅에서 예상치 못한 질문을 받았을 때 대처하는 법. 완벽한 준비보다 유연한 대응이 더 중요하다는...',
  },
  threads: {
    id: '4',
    title: 'Threads (짧은 에세이)',
    platform: 'threads',
    content: `1/ 오늘 클라이언트 미팅, 준비한 건 100가지였는데 질문은 101번째가 나왔다.

2/ 순간 멘붕. 하지만 팀원들과 눈빛 교환 한 번에 역할 분담 완료.

3/ A는 기술적 설명, B는 비즈니스 임팩트, 나는 실제 사례. 각자의 강점이 모여 완벽한 답변 완성.

4/ 결론: 완벽한 준비보다 유연한 대응. 혼자 100점보다 함께 80점이 더 강력하다.

5/ 그리고 이게 진짜 팀워크 아닐까? 🤝`,
    summary: '오늘 클라이언트 미팅에서 배운 교훈. 완벽한 준비보다 유연한 대응, 혼자 100점보다 함께 80점이 더 강력하다는...',
  },
};

const Results = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCardClick = (platform: string) => {
    setSelectedPlatform(platform);
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
  };

  return (
    <div className="min-h-screen bg-background p-6 py-8">
      <div className="w-full max-w-[430px] mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">오늘의 결과</h1>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(mockResults).map(([key, result]) => {
            const { icon: Icon, color } = platformIcons[key as keyof typeof platformIcons];
            
            return (
              <button
                key={key}
                onClick={() => handleCardClick(key)}
                className="bg-white rounded-2xl p-4 border border-border hover:shadow-lg transition-all text-left space-y-3"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm mb-1">
                    {result.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {result.summary}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Create Another Button */}
        <div className="pt-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/input')}
            className="w-full h-12 rounded-xl"
          >
            새로운 기록 만들기
          </Button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPlatform && (
        <ResultDetailModal
          isOpen={!!selectedPlatform}
          onClose={() => setSelectedPlatform(null)}
          platform={selectedPlatform}
          content={mockResults[selectedPlatform as keyof typeof mockResults].content}
          outputId={mockResults[selectedPlatform as keyof typeof mockResults].id}
          onCopy={handleCopy}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Results;
