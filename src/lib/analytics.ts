// Analytics utility for GA4 and Meta Pixel dual-track logging
// Safely wraps gtag and fbq functions with SSR safety

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Environment variables for tracking IDs
const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || "";
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "";

// 👇 여기 아래에 이 로그를 추가하세요! (정석 디버깅)
console.log("[Analytics Setup] ID Check:", {
  gaId: GA4_MEASUREMENT_ID,
  pixelId: META_PIXEL_ID,
});

// UTM parameter storage key
const UTM_STORAGE_KEY = "knots_entry_source";

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
}

/**
 * Parse and store UTM parameters from URL on first page load
 */
export function parseAndStoreUTM(): UTMParams {
  if (typeof window === "undefined") return {};

  // Check if already stored in this session
  const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Continue to parse from URL
    }
  }

  // Parse from URL
  const params = new URLSearchParams(window.location.search);
  const utmParams: UTMParams = {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_term: params.get("utm_term") || undefined,
    utm_content: params.get("utm_content") || undefined,
    referrer: document.referrer || undefined,
  };

  // Clean undefined values
  const cleanParams = Object.fromEntries(Object.entries(utmParams).filter(([_, v]) => v !== undefined)) as UTMParams;

  // Store in sessionStorage
  if (Object.keys(cleanParams).length > 0) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(cleanParams));
  }

  return cleanParams;
}

/**
 * Get stored UTM parameters
 */
export function getStoredUTM(): UTMParams {
  if (typeof window === "undefined") return {};

  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Get entry source string for database storage
 */
export function getEntrySource(): string | null {
  const utm = getStoredUTM();
  if (utm.utm_source) {
    return utm.utm_source;
  }
  if (utm.referrer) {
    try {
      return new URL(utm.referrer).hostname;
    } catch {
      return utm.referrer;
    }
  }
  return null;
}

/**
 * Initialize GA4 script
 */
export function initGA4(): void {
  if (typeof window === "undefined" || !GA4_MEASUREMENT_ID) {
    console.log("[Analytics] GA4 not initialized: missing measurement ID");
    return;
  }

  // Check if already initialized
  if (document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) {
    return;
  }

  // Add gtag script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer!.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID, {
    send_page_view: true,
  });

  console.log("[Analytics] GA4 initialized:", GA4_MEASUREMENT_ID);
}

/**
 * Initialize Meta Pixel script
 */
export function initMetaPixel(): void {
  if (typeof window === "undefined" || !META_PIXEL_ID) {
    console.log("[Analytics] Meta Pixel not initialized: missing pixel ID");
    return;
  }

  // Check if already initialized
  if (window.fbq) {
    return;
  }

  // Meta Pixel base code
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");

  console.log("[Analytics] Meta Pixel initialized:", META_PIXEL_ID);
}

/**
 * Initialize all analytics SDKs
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;

  // Parse and store UTM on first load
  parseAndStoreUTM();

  // Initialize tracking SDKs
  initGA4();
  initMetaPixel();
}

/**
 * Track event to GA4
 */
export function trackGA4Event(eventName: string, params?: Record<string, any>): void {
  if (typeof window === "undefined" || !window.gtag) {
    console.log("[Analytics] GA4 not available for event:", eventName);
    return;
  }

  try {
    window.gtag("event", eventName, {
      ...params,
      entry_source: getEntrySource(),
    });
    console.log("[Analytics] GA4 event:", eventName, params);
  } catch (error) {
    console.error("[Analytics] GA4 event error:", error);
  }
}

/**
 * Track event to Meta Pixel
 */
export function trackMetaEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === "undefined" || !window.fbq) {
    console.log("[Analytics] Meta Pixel not available for event:", eventName);
    return;
  }

  try {
    window.fbq("trackCustom", eventName, {
      ...params,
      entry_source: getEntrySource(),
    });
    console.log("[Analytics] Meta Pixel event:", eventName, params);
  } catch (error) {
    console.error("[Analytics] Meta Pixel event error:", error);
  }
}

/**
 * Track standard Meta Pixel conversion event
 */
export function trackMetaConversion(eventName: string, params?: Record<string, any>): void {
  if (typeof window === "undefined" || !window.fbq) {
    console.log("[Analytics] Meta Pixel not available for conversion:", eventName);
    return;
  }

  try {
    window.fbq("track", eventName, params);
    console.log("[Analytics] Meta Pixel conversion:", eventName, params);
  } catch (error) {
    console.error("[Analytics] Meta Pixel conversion error:", error);
  }
}

/**
 * Dual-track event: fires to both GA4 and Meta Pixel
 */
export function trackDualEvent(eventName: string, params?: Record<string, any>): void {
  trackGA4Event(eventName, params);
  trackMetaEvent(eventName, params);
}

// ============================================
// Pre-defined Event Tracking Functions
// ============================================

/**
 * Track input submission (Step A)
 */
export function trackSubmitInput(inputType: "voice" | "text", inputLength: number): void {
  const params = {
    input_type: inputType,
    input_length: inputLength,
  };

  trackDualEvent("submit_input", params);
}

/**
 * Track result view (Step B)
 */
export function trackViewResult(sessionId: string, platformCount: number = 4): void {
  const params = {
    session_id: sessionId,
    platform_count: platformCount,
  };

  trackGA4Event("view_result", params);
  // Meta: Track as ViewContent standard event
  trackMetaConversion("ViewContent", {
    content_type: "ai_generated_content",
    content_ids: [sessionId],
  });
}

/**
 * Track copy action (Step C - Conversion)
 */
export function trackClickCopy(targetPlatform: string, outputId: string): void {
  const params = {
    target_platform: targetPlatform,
    output_id: outputId,
    entry_source: getEntrySource(),
  };

  trackGA4Event("click_copy", params);
  // Meta: Track as Lead conversion (high-intent action)
  trackMetaConversion("Lead", {
    content_name: targetPlatform,
    content_category: "copy_content",
  });
}

/**
 * Track save action
 */
export function trackSaveContent(targetPlatform: string, outputId: string): void {
  const params = {
    target_platform: targetPlatform,
    output_id: outputId,
  };

  trackDualEvent("save_content", params);
}

/**
 * Track content refinement
 */
export function trackRefineContent(refineMode: string, targetPlatform: string): void {
  const params = {
    refine_mode: refineMode,
    target_platform: targetPlatform,
  };

  trackDualEvent("refine_content", params);
}

/**
 * Track rating feedback
 */
export function trackRating(rating: "positive" | "negative", outputId: string): void {
  const params = {
    rating,
    output_id: outputId,
  };

  trackDualEvent("rate_content", params);
}

/**
 * Track page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === "undefined") return;

  // GA4 page view
  if (window.gtag) {
    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }

  // Meta Pixel page view is automatic, but we can track custom
  if (window.fbq) {
    window.fbq("track", "PageView");
  }
}
