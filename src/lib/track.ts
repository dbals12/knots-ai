/**
 * Unified analytics tracking module.
 *
 * trackEvent(eventName, props) sends to ALL THREE simultaneously:
 *   A) GA4 via window.gtag (with debug_mode in DEV)
 *   B) Meta Pixel via window.fbq
 *   C) Supabase log-event Edge Function → public.events table
 *
 * All channels are safe-guarded: no crashes if SDK missing.
 * Console.log("TRACKED:<event>") on every call for verification.
 */

import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./session";
import { getAcquisitionContext } from "./acquisition";

// ── Window type extensions ──
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export interface TrackProps {
  /** analytics_session_id: client-side UUID stored in localStorage (no FK) */
  analytics_session_id?: string;
  /** db_session_id: real sessions.id from DB (FK-safe, only when session exists) */
  db_session_id?: string | null;
  user_id?: string | null;
  is_guest?: boolean;
  draft_id?: string | null;
  input_type?: "voice" | "text" | null;
  input_seq?: number;
  is_first_input?: boolean;
  page?: string;
  platform_type?: string | null;
  experiment_id?: string | null;
  [key: string]: unknown;
}

async function getAuthContext(): Promise<{
  userId: string | null;
  isGuest: boolean;
  accessToken: string | null;
}> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id ?? null;
    const accessToken = data?.session?.access_token ?? null;
    return { userId, isGuest: !userId, accessToken };
  } catch {
    return { userId: null, isGuest: true, accessToken: null };
  }
}

/**
 * Core tracking function. Fires GA4 + Meta Pixel + Supabase simultaneously.
 * NEVER throws — app always continues.
 */
export async function trackEvent(
  eventName: string,
  props: TrackProps = {}
): Promise<void> {
  if (typeof window === "undefined") return;

  const { userId, isGuest, accessToken } = await getAuthContext();
  const acq = getAcquisitionContext();
  const analyticsSessionId = getSessionId(); // localStorage UUID
  const ts = Date.now();

  const merged: TrackProps & { ts: number } = {
    db_session_id: null,
    user_id: userId,
    is_guest: isGuest,
    draft_id: null,
    input_type: null,
    platform_type: acq.platform_type ?? null,
    experiment_id: null,
    ts,
    ...acq,
    ...props,
    // analytics_session_id always uses real localStorage value (never undefined)
    analytics_session_id: props.analytics_session_id || analyticsSessionId,
  };

  // ── Console verification (always, not just DEV) ──
  console.log(`TRACKED:${eventName}`, {
    analytics_session_id: merged.analytics_session_id,
    db_session_id: merged.db_session_id,
    draft_id: merged.draft_id,
    user_id: merged.user_id,
    is_guest: merged.is_guest,
    ...props,
  });

  // ── A) GA4 ──
  try {
    if (window.gtag) {
      window.gtag("event", eventName, {
        ...merged,
        event_category: "knots",
        // Enable debug_mode so GA4 DebugView shows events in dev/preview
        debug_mode: import.meta.env.DEV || window.location.hostname.includes("lovable.app"),
      });
    } else {
      console.warn("[trackEvent] GA4 gtag not available for:", eventName);
    }
  } catch (e) {
    console.warn("[trackEvent] GA4 error:", e);
  }

  // ── B) Meta Pixel ──
  try {
    if (window.fbq) {
      window.fbq("trackCustom", eventName, merged);
    }
  } catch (e) {
    console.warn("[trackEvent] Meta Pixel error:", e);
  }

  // ── C) Supabase via log-event Edge Function ──
  try {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    supabase.functions
      .invoke("log-event", {
        body: {
          event_type: eventName,
          analytics_session_id: merged.analytics_session_id ?? null,
          db_session_id: merged.db_session_id ?? null,
          draft_id: merged.draft_id ?? null,
          platform_type: merged.platform_type ?? null,
          metadata: {
            ...merged,
            is_guest: isGuest,
          },
        },
        headers,
      })
      .catch((e) => {
        console.warn("[trackEvent] Supabase log-event error:", e);
      });
  } catch (e) {
    console.warn("[trackEvent] Supabase invoke error:", e);
  }
}

// ── Convenience wrappers matching canonical event list ──

export const track = {
  pageView: (page: string, extra?: TrackProps) =>
    trackEvent("page_view", { page, ...extra }),

  /**
   * submit_input: fires at the MOMENT user submits (draft_id must be provided).
   * This is the #1 funnel event — never skip or delay.
   */
  submitInput: (inputType: "voice" | "text", extra?: TrackProps) =>
    trackEvent("submit_input", { input_type: inputType, page: "home", ...extra }),

  /**
   * view_result: fires when result screen is shown to user.
   * Standardized name (not result_view).
   */
  viewResult: (extra?: TrackProps) =>
    trackEvent("view_result", { page: "result", ...extra }),

  clickCopy: (platformType: string, extra?: TrackProps) =>
    trackEvent("click_copy", { platform_type: platformType, ...extra }),

  refineContent: (refineMode: string, platformType: string, extra?: TrackProps) =>
    trackEvent("refine_content", {
      refine_mode: refineMode,
      platform_type: platformType,
      ...extra,
    }),

  saveContent: (platformType: string, extra?: TrackProps) =>
    trackEvent("save_content", { platform_type: platformType, ...extra }),

  loginSuccess: (extra?: TrackProps) =>
    trackEvent("login_success", { page: "login", ...extra }),

  thumbUp: (platformType: string, extra?: TrackProps) =>
    trackEvent("thumb_up", { platform_type: platformType, ...extra }),

  thumbDown: (platformType: string, extra?: TrackProps) =>
    trackEvent("thumb_down", { platform_type: platformType, ...extra }),

  aiTool: (toolName: string, platformType: string, extra?: TrackProps) =>
    trackEvent(`ai_tool_${toolName}`, { platform_type: platformType, ...extra }),

  promoteStart: (draftId: string, extra?: TrackProps) =>
    trackEvent("promote_start", { draft_id: draftId, ...extra }),

  promoteSuccess: (draftId: string, sessionId: string, extra?: TrackProps) =>
    trackEvent("promote_success", {
      draft_id: draftId,
      db_session_id: sessionId,
      ...extra,
    }),

  openPlatformModal: (platformType: string, extra?: TrackProps) =>
    trackEvent("open_platform_modal", { platform_type: platformType, ...extra }),
};

export default track;
