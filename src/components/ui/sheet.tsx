import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";
import { useRef, useState, useCallback } from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  onSwipeClose?: () => void;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, onSwipeClose, ...props }, ref) => {
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      // ONLY allow drag from the handle zone - not from content area
      const target = e.target as HTMLElement;
      const isInHandleZone = target.closest('[data-sheet-handle]') !== null;
      
      if (isInHandleZone) {
        const touch = e.touches[0];
        startYRef.current = touch.clientY;
        setIsDragging(true);
      }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;
      
      // Only allow dragging down
      if (deltaY > 0) {
        setDragY(deltaY);
      }
    }, [isDragging]);

    const handleTouchEnd = useCallback(() => {
      if (!isDragging) return;
      
      // If dragged more than 100px, close the sheet
      if (dragY > 100) {
        onSwipeClose?.();
        // Trigger close via the primitive's onOpenChange
        const closeButton = contentRef.current?.querySelector('[data-radix-collection-item]');
        if (closeButton instanceof HTMLElement) {
          closeButton.click();
        }
      }
      
      setDragY(0);
      setIsDragging(false);
    }, [isDragging, dragY, onSwipeClose]);

    const isBottomSheet = side === "bottom";

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content 
          ref={ref} 
          className={cn(sheetVariants({ side }), className)} 
          style={isBottomSheet && isDragging ? { 
            transform: `translateY(${dragY}px)`,
            transition: 'none'
          } : undefined}
          {...props}
        >
          <div
            ref={contentRef}
            className="h-full flex flex-col"
            onTouchStart={isBottomSheet ? handleTouchStart : undefined}
            onTouchMove={isBottomSheet ? handleTouchMove : undefined}
            onTouchEnd={isBottomSheet ? handleTouchEnd : undefined}
          >
            {/* Swipe handle for bottom sheets */}
            {isBottomSheet && (
              <div 
                data-sheet-handle
                className="flex justify-center pt-2 pb-4 cursor-grab active:cursor-grabbing"
              >
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
              </div>
            )}
            {children}
          </div>
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
