/**
 * use-toast.ts — Sonner 기반 단일 토스트 시스템
 *
 * ⚠️ 프로젝트 전체에서 toast를 쓸 때 반드시 이 파일만 import할 것.
 *    `import { toast } from "sonner"` 직접 호출 금지.
 *
 * 사용법:
 *   import { useToast } from "@/hooks/use-toast";
 *   const { toast } = useToast();
 *   toast({ title: "완료!", description: "..." });
 */

import { toast as sonnerToast } from "sonner";

// 중복 방지: 같은 title+variant 3초 이내 재호출 차단
const recentToastKeys = new Map<string, number>();
const DEDUP_WINDOW_MS = 3000;
const DEFAULT_DURATION = 2500;
const ERROR_DURATION = 6000;

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

function toast(options: ToastOptions | string) {
  // 문자열 단축 형태 지원
  if (typeof options === "string") {
    if (!options.trim()) return;
    sonnerToast(options, { duration: DEFAULT_DURATION });
    return;
  }

  const { title, description, variant, duration } = options;

  // 🚫 빈 토스트 완전 차단
  const hasTitle = title !== undefined && title !== null && String(title).trim() !== "";
  const hasDescription =
    description !== undefined && description !== null && String(description).trim() !== "";
  if (!hasTitle && !hasDescription) {
    // DEV 환경에서만 호출 스택 출력 (프로덕션 콘솔 스팸 방지)
    if (import.meta.env.DEV) {
      console.warn("[use-toast] EMPTY_TOAST_BLOCKED", new Error().stack);
    }
    return;
  }

  // 중복 방지
  const dedupKey = `${String(title ?? "")}_${variant ?? "default"}`;
  const lastShown = recentToastKeys.get(dedupKey);
  const now = Date.now();
  if (lastShown && now - lastShown < DEDUP_WINDOW_MS) return;
  recentToastKeys.set(dedupKey, now);

  const finalDuration = duration ?? (variant === "destructive" ? ERROR_DURATION : DEFAULT_DURATION);
  const message = title || description || "";
  const descriptionText = title && description ? description : undefined;

  if (variant === "destructive") {
    sonnerToast.error(message, {
      description: descriptionText,
      duration: finalDuration,
    });
  } else {
    sonnerToast(message, {
      description: descriptionText,
      duration: finalDuration,
    });
  }
}

function useToast() {
  return { toast };
}

export { useToast, toast };
