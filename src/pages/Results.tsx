import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Copy, Save, RotateCcw, BookOpen, Linkedin, Video, MessageSquare } from 'lucide-react';

const mockResults = {
  blog: {
    title: 'The Future of Remote Work',
    content: 'In today\'s rapidly evolving workplace, remote work has transformed from a temporary solution to a permanent fixture...',
  },
  linkedin: {
    content: '🚀 Exciting insights on remote work transformation!\n\nAfter 3 years of leading distributed teams, here\'s what I\'ve learned about the future of work...',
  },
  reels: {
    visual: 'Close-up shot of workspace setup → Pan to laptop screen → Zoom out to full home office',
    script: 'Hook: "Here\'s what no one tells you about remote work..."\nBody: Share 3 key insights with dynamic transitions\nCTA: "Follow for more career tips!"',
  },
  threads: {
    content: '1/ Remote work isn\'t just about working from home.\n\n2/ It\'s about building trust, async communication, and outcome-focused culture.\n\n3/ Here\'s what changed everything for our team...',
  },
};

const platformConfig = {
  blog: { icon: BookOpen, color: 'blog', label: 'Blog Post' },
  linkedin: { icon: Linkedin, color: 'linkedin', label: 'LinkedIn' },
  reels: { icon: Video, color: 'reels', label: 'Reels Script' },
  threads: { icon: MessageSquare, color: 'threads', label: 'Threads' },
};

const Results = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = async (content: string, platform: string) => {
    await navigator.clipboard.writeText(content);
    toast({
      title: 'Copied!',
      description: `${platform} content copied to clipboard`,
    });
  };

  const handleSave = async (platform: string) => {
    setLoading(platform);
    setTimeout(() => {
      setLoading(null);
      toast({
        title: 'Saved!',
        description: `${platform} content saved to your library`,
      });
    }, 1000);
  };

  const handleRegenerate = async (platform: string) => {
    setLoading(platform);
    setTimeout(() => {
      setLoading(null);
      toast({
        title: 'Regenerated!',
        description: `New ${platform} content generated`,
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Your Content, Refracted</h1>
          <p className="text-muted-foreground">Choose a format and make it yours</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Blog Card */}
          <Card className="p-6 space-y-4 border-l-4 border-l-blog">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blog/10">
                <BookOpen className="w-5 h-5 text-blog" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Blog Post</h2>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">{mockResults.blog.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-4">{mockResults.blog.content}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleCopy(mockResults.blog.content, 'Blog')}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSave('blog')} disabled={loading === 'blog'}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleRegenerate('blog')} disabled={loading === 'blog'}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* LinkedIn Card */}
          <Card className="p-6 space-y-4 border-l-4 border-l-linkedin">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-linkedin/10">
                <Linkedin className="w-5 h-5 text-linkedin" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">LinkedIn Post</h2>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{mockResults.linkedin.content}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleCopy(mockResults.linkedin.content, 'LinkedIn')}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSave('linkedin')} disabled={loading === 'linkedin'}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleRegenerate('linkedin')} disabled={loading === 'linkedin'}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Reels Card */}
          <Card className="p-6 space-y-4 border-l-4 border-l-reels">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-reels/10">
                <Video className="w-5 h-5 text-reels" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Reels Script</h2>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-reels">VISUAL:</span>
                <p className="text-sm text-muted-foreground mt-1">{mockResults.reels.visual}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-reels">SCRIPT:</span>
                <p className="text-sm text-muted-foreground mt-1">{mockResults.reels.script}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleCopy(`${mockResults.reels.visual}\n\n${mockResults.reels.script}`, 'Reels')}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSave('reels')} disabled={loading === 'reels'}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleRegenerate('reels')} disabled={loading === 'reels'}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Threads Card */}
          <Card className="p-6 space-y-4 border-l-4 border-l-threads">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-threads/10">
                <MessageSquare className="w-5 h-5 text-threads" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Threads</h2>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{mockResults.threads.content}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleCopy(mockResults.threads.content, 'Threads')}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSave('threads')} disabled={loading === 'threads'}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleRegenerate('threads')} disabled={loading === 'threads'}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center">
          <Button variant="outline" onClick={() => window.location.href = '/home'}>
            Create Another
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
