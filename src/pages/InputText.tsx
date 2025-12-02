import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const moods = [
  { value: 'energetic', label: '🔥 불타는 하루' },
  { value: 'tired', label: '😞 좀 힘들고 지쳤다' },
  { value: 'proud', label: '😊 뿌듯했다' },
  { value: 'neutral', label: '😐 그냥 그런 날' },
  { value: 'chaotic', label: '🤯 정신 없었다' },
];

const personas = [
  { value: 'growth', label: '🌱 성장한 나', desc: '배운 점, 성장 포인트 중심' },
  { value: 'achiever', label: '💼 일잘러 나', desc: '성과, 문제 해결, 인사이트 중심' },
  { value: 'collaborator', label: '🤝 협업한 나', desc: '사람, 팀워크, 관계 중심' },
  { value: 'challenger', label: '⚡ 갈등한 나', desc: '어려움, 스트레스, 고민을 솔직히' },
  { value: 'authentic', label: '💬 날것의 나', desc: '포장 없이 있는 그대로' },
];

const InputText = () => {
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [keyword, setKeyword] = useState('');
  const [textInput, setTextInput] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleComplete = () => {
    if (!selectedMood || !selectedPersona) {
      toast({
        title: '선택이 필요해요',
        description: '오늘의 기분과 모드를 먼저 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!textInput.trim()) {
      toast({
        title: '입력이 필요해요',
        description: '내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    navigate('/result');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Switch Manager</h1>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-1" />
          로그아웃
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 space-y-8">
        <div className="w-full max-w-[430px] mx-auto space-y-8">
          
          {/* Mood Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              오늘 하루는 어땠나요?
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl border-2 transition-all whitespace-nowrap ${
                    selectedMood === mood.value
                      ? 'border-foreground bg-white shadow-sm'
                      : 'border-border bg-white hover:border-foreground/30'
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Persona Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              오늘은 어떤 나로 정리할까요?
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {personas.map((persona) => (
                <button
                  key={persona.value}
                  onClick={() => setSelectedPersona(persona.value)}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl border-2 transition-all ${
                    selectedPersona === persona.value
                      ? 'border-foreground bg-white shadow-sm'
                      : 'border-border bg-white hover:border-foreground/30'
                  }`}
                >
                  <div className="text-sm font-medium text-foreground whitespace-nowrap">
                    {persona.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                    {persona.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Keyword Input */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">
              오늘의 키워드 (한두 단어로 정리해볼까요?)
            </label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 클라이언트 미팅, 런칭, 실수"
              className="h-11 rounded-xl border-border bg-white"
            />
          </div>

          {/* Text Input Area */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">
              오늘 있었던 일이나 배운 점을 자유롭게 작성해주세요.
            </label>
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="여기에 입력하세요..."
              className="min-h-[300px] rounded-xl border-border bg-white"
            />
          </div>

          {/* Complete Button */}
          <Button
            onClick={handleComplete}
            className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            완료
          </Button>

        </div>
      </main>
    </div>
  );
};

export default InputText;
