import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-prism-gradient mb-4">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-foreground">Switch Manager</h1>
        <p className="text-xl text-muted-foreground">
          Transform your 3-minute voice memo into powerful content for Blog, LinkedIn, Reels, and Threads
        </p>
        <Button size="lg" onClick={() => navigate('/auth')}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
