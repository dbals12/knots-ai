/**
 * use-toast.ts — Sonner 기반 단일 토스트 시스템
 *
 * 이전: Radix UI Toast (ToastProvider/ToastViewport/ToastClose → 검은 X 버튼 버그)
 * 현재: Sonner toast 얇은 래퍼
 *
 * 모든 페이지에서 import { useToast } from "@/hooks/use-toast" 로 그대로 사용 가능.
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
  if (!hasTitle && !hasDescription) return;

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
