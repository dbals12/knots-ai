import { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface InstagramCardViewProps {
  content: string;
}

interface ParsedSlide {
  header: string;
  content: string;
}

const InstagramCardView = ({ content }: InstagramCardViewProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<ParsedSlide | null>(null);
  const { toast } = useToast();

  // Parse the content into slides and caption
  const parseContent = (rawContent: string): { slides: ParsedSlide[], caption: string } => {
    const slides: ParsedSlide[] = [];
    let caption = '';

    // Split by [Slide X] or [Caption] headers
    const parts = rawContent.split(/\[Slide \d+\]|\[Caption\]/gi);
    const headers = rawContent.match(/\[Slide \d+\]|\[Caption\]/gi) || [];

    headers.forEach((header, index) => {
      const partContent = parts[index + 1]?.trim() || '';
      
      if (header.toLowerCase().includes('caption')) {
        caption = partContent;
      } else {
        slides.push({
          header: header.replace(/[\[\]]/g, ''),
          content: partContent,
        });
      }
    });

    return { slides, caption };
  };

  const handleCopySlide = async (slideContent: string, index: number) => {
    try {
      await navigator.clipboard.writeText(slideContent);
      setCopiedIndex(index);
      toast({
        title: '텍스트가 복사되었습니다.',
        description: '캔바에 바로 붙여넣기 하세요!',
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      toast({
        title: '복사에 실패했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleCopyCaption = async (captionText: string) => {
    try {
      await navigator.clipboard.writeText(captionText);
      setCopiedIndex(-1); // Use -1 for caption
      toast({
        title: '캡션이 복사되었습니다.',
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      toast({
        title: '복사에 실패했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleSlideClick = (slide: ParsedSlide) => {
    setSelectedSlide(slide);
  };

  const { slides, caption } = parseContent(content);

  if (slides.length === 0) {
    // Fallback: if parsing fails, just show the raw content
    return (
      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tip */}
      <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
        💡 카드를 클릭하면 전체 내용을 볼 수 있어요. 캔바/미리캔버스에 바로 붙여넣기 하세요!
      </p>

      {/* Horizontal Scroll Cards */}
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
        {slides.map((slide, index) => (
          <button
            key={index}
            onClick={() => handleSlideClick(slide)}
            className="flex-shrink-0 w-[140px] h-[180px] bg-gradient-to-br from-background to-muted/30 border border-border rounded-xl p-4 flex flex-col justify-between text-left hover:shadow-lg hover:border-foreground/30 transition-all snap-start relative group"
          >
            {/* Slide Number */}
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {slide.header}
            </span>
            
            {/* Slide Content - Preview (truncated) */}
            <p className="text-sm font-medium text-foreground leading-snug flex-1 mt-2 line-clamp-4 whitespace-pre-wrap overflow-hidden">
              {slide.content}
            </p>

            {/* View More Indicator */}
            <div className="absolute bottom-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-muted-foreground">자세히</span>
            </div>
          </button>
        ))}
      </div>

      {/* Caption Section */}
      {caption && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Caption
            </span>
            <button
              onClick={() => handleCopyCaption(caption)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copiedIndex === -1 ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span>복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>복사</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-muted/30 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
            {caption}
          </div>
        </div>
      )}

      {/* Slide Detail Modal */}
      <Dialog open={!!selectedSlide} onOpenChange={() => setSelectedSlide(null)}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {selectedSlide?.header}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Full Slide Content */}
            <div className="bg-muted/20 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
              {selectedSlide?.content}
            </div>

            {/* Copy Button */}
            <Button
              onClick={() => {
                if (selectedSlide) {
                  handleCopySlide(selectedSlide.content, slides.indexOf(selectedSlide));
                }
              }}
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              {copiedIndex === slides.indexOf(selectedSlide!) ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  텍스트 복사하기
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstagramCardView;