/**
 * Unified analytics tracking module.
 *
 * trackEvent(eventName, props) sends to:
 *   A) Supabase events table via log-event Edge Function
 *   B) GA4 via window.gtag
 *   C) Meta Pixel via window.fbq
 *
 * All channels are safe-guarded: no crashes if SDK missing.
 * DEV only: one-line console.info per event.
 */

import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./session";
import { getAcquisitionContext } from "./acquisition";

// Window extensions are already declared in analytics.ts — no re-declaration needed

export interface TrackProps {
  session_id?: string;
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

async function getAuthContext(): Promise<{ userId: string | null; isGuest: boolean; accessToken: string | null }> {
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
 * Core tracking function. Call on every user action.
 * draft_id: null is explicitly allowed — do NOT block on missing draft_id.
 */
export async function trackEvent(eventName: string, props: TrackProps = {}): Promise<void> {
  if (typeof window === "undefined") return;

  const { userId, isGuest, accessToken } = await getAuthContext();
  const acq = getAcquisitionContext();
  const sid = getSessionId();
  const ts = Date.now();

  const merged: TrackProps = {
    session_id: sid,
    user_id: userId,
    is_guest: isGuest,
    draft_id: null,
    input_type: null,
    platform_type: acq.platform_type ?? null,
    experiment_id: null,
    ts,
    ...acq,
    ...props,
  };

  if (import.meta.env.DEV) {
    console.info("[trackEvent]", eventName, merged);
  }

  // ── A) Supabase via log-event Edge Function ──
  try {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    supabase.functions
      .invoke("log-event", {
        body: {
          event_type: eventName,
          session_id: merged.session_id ?? null,
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
        if (import.meta.env.DEV) console.warn("[trackEvent] Supabase log-event error:", e);
      });
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[trackEvent] Supabase invoke error:", e);
  }

  // ── B) GA4 ──
  try {
    if (window.gtag) {
      window.gtag("event", eventName, {
        ...merged,
        event_category: "knots",
      });
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[trackEvent] GA4 error:", e);
  }

  // ── C) Meta Pixel ──
  try {
    if (window.fbq) {
      window.fbq("trackCustom", eventName, merged);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[trackEvent] Meta Pixel error:", e);
  }
}

// ── Convenience wrappers matching canonical event list ──

export const track = {
  pageView: (page: string, extra?: TrackProps) =>
    trackEvent("page_view", { page, ...extra }),

  submitInput: (inputType: "voice" | "text", extra?: TrackProps) =>
    trackEvent("submit_input", { input_type: inputType, page: "home", ...extra }),

  viewResult: (extra?: TrackProps) =>
    trackEvent("view_result", { page: "result", ...extra }),

  clickCopy: (platformType: string, extra?: TrackProps) =>
    trackEvent("click_copy", { platform_type: platformType, ...extra }),

  refineContent: (refineMode: string, platformType: string, extra?: TrackProps) =>
    trackEvent("refine_content", { refine_mode: refineMode, platform_type: platformType, ...extra }),

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
    trackEvent("promote_success", { draft_id: draftId, session_id: sessionId, ...extra }),
};

export default track;
