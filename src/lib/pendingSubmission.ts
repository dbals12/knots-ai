export const PENDING_SUBMISSION_KEY = "pending_submission";
export const LEGACY_GUEST_INPUT_KEY = "knots_guest_input";

export type PendingSubmission = {
  selectedMood: string;
  selectedPersona: string;
  sessionPurpose?: string;
  keyword?: string;
  textInput: string;
  inputMode?: "voice" | "text";
  createdAt?: number;
  /** When false, we restore the draft but don't auto-run to avoid loops after failures. */
  autoExecute?: boolean;
};

const safeGet = (key: string) => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const safeRemove = (key: string) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

export function savePendingSubmission(data: PendingSubmission) {
  // Always write to the new key.
  safeSet(
    PENDING_SUBMISSION_KEY,
    JSON.stringify({
      ...data,
      inputMode: data.inputMode ?? "text",
      autoExecute: data.autoExecute ?? true,
      createdAt: data.createdAt ?? Date.now(),
    })
  );
}

export function getPendingSubmission(): PendingSubmission | null {
  const raw = safeGet(PENDING_SUBMISSION_KEY) ?? safeGet(LEGACY_GUEST_INPUT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingSubmission;
    return {
      ...parsed,
      inputMode: parsed.inputMode ?? "text",
      autoExecute: parsed.autoExecute ?? true,
    };
  } catch {
    return null;
  }
}

export function setPendingSubmissionAutoExecute(autoExecute: boolean) {
  const existing = getPendingSubmission();
  if (!existing) return;
  savePendingSubmission({ ...existing, autoExecute });
}

export function clearPendingSubmission() {
  safeRemove(PENDING_SUBMISSION_KEY);
  safeRemove(LEGACY_GUEST_INPUT_KEY);
}
