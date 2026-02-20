/**
 * Acquisition context: UTM params + platform_type from URL.
 * Parsed once on first load and persisted to localStorage.
 */

const ACQ_KEY = "knots_acq";

export interface AcquisitionContext {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  platform_type?: string;
  referrer?: string;
}

export function parseAndStoreAcquisition(): AcquisitionContext {
  if (typeof window === "undefined") return {};

  // Return cached value if already stored this session
  const cached = sessionStorage.getItem(ACQ_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through
    }
  }

  const p = new URLSearchParams(window.location.search);
  const ctx: AcquisitionContext = {};

  const utm_source = p.get("utm_source");
  const utm_medium = p.get("utm_medium");
  const utm_campaign = p.get("utm_campaign");
  const utm_content = p.get("utm_content");
  const utm_term = p.get("utm_term");
  const platform_type = p.get("platform_type");
  const referrer = document.referrer || undefined;

  if (utm_source) ctx.utm_source = utm_source;
  if (utm_medium) ctx.utm_medium = utm_medium;
  if (utm_campaign) ctx.utm_campaign = utm_campaign;
  if (utm_content) ctx.utm_content = utm_content;
  if (utm_term) ctx.utm_term = utm_term;
  if (platform_type) ctx.platform_type = platform_type;
  if (referrer) ctx.referrer = referrer;

  if (Object.keys(ctx).length > 0) {
    sessionStorage.setItem(ACQ_KEY, JSON.stringify(ctx));
  }

  return ctx;
}

export function getAcquisitionContext(): AcquisitionContext {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(ACQ_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Convenience: returns utm_source or parsed hostname of referrer */
export function getEntrySource(): string | null {
  const ctx = getAcquisitionContext();
  if (ctx.utm_source) return ctx.utm_source;
  if (ctx.referrer) {
    try {
      return new URL(ctx.referrer).hostname;
    } catch {
      return ctx.referrer;
    }
  }
  return null;
}
