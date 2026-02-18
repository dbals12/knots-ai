/**
 * sonner.tsx — Toaster 렌더 전용 (단순 마운트 컴포넌트)
 *
 * ⚠️ toast 함수는 절대 이 파일에서 export하지 않음.
 *    모든 toast 호출은 반드시 @/hooks/use-toast 경유할 것.
 *    직접 `import { toast } from "sonner"` 사용 금지.
 */

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = () => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      duration={2500}
      closeButton={false}
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  );
};

// Toaster만 export. toast는 절대 export하지 않음.
export { Toaster };
