/**
 * Session ID management — persisted in localStorage across page loads.
 * Generates a UUID on first visit, reuses on subsequent visits.
 */

const SESSION_KEY = "knots_sid";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = generateUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// ── input_seq: per (session_id or draft_id) incrementing counter ──

function inputSeqKey(id: string): string {
  return `input_seq:${id}`;
}

/** Returns { seq, isFirst } and increments counter atomically */
export function getNextInputSeq(id: string): { seq: number; isFirst: boolean } {
  const key = inputSeqKey(id);
  const prev = parseInt(localStorage.getItem(key) || "0", 10);
  const next = prev + 1;
  localStorage.setItem(key, String(next));
  return { seq: next, isFirst: next === 1 };
}
