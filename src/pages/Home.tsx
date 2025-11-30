import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, X } from 'lucide-react';

const Home = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const navigate = useNavigate();

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate recording for 3 seconds
      setTimeout(() => {
        setIsRecording(false);
        navigate('/results');
      }, 3000);
    }
  };

  const addKeyword = () => {
    if (currentKeyword && keywords.length < 3) {
      setKeywords([...keywords, currentKeyword]);
      setCurrentKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4">
      <div className="max-w-2xl mx-auto pt-20 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Your Story, Refracted</h1>
          <p className="text-muted-foreground">Record your thoughts and watch them transform</p>
        </div>

        <div className="flex flex-col items-center space-y-8">
          <button
            onClick={toggleRecording}
            disabled={isRecording}
            className={`relative w-48 h-48 rounded-full transition-all duration-300 ${
              isRecording
                ? 'bg-destructive scale-95 animate-pulse'
                : 'bg-prism-gradient hover:scale-105 shadow-2xl'
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <Mic className="w-20 h-20 text-white" />
            </div>
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />
            )}
          </button>

          <p className="text-sm font-medium text-muted-foreground">
            {isRecording ? 'Recording... Speak now' : 'Tap to record (up to 3 minutes)'}
          </p>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">
            Add up to 3 keywords (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentKeyword}
              onChange={(e) => setCurrentKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="e.g., leadership, innovation..."
              disabled={keywords.length >= 3}
              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={addKeyword}
              disabled={!currentKeyword || keywords.length >= 3}
            >
              Add
            </Button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="pl-3 pr-2 py-1 text-sm"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(index)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
