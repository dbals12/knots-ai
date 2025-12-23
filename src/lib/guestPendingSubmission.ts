export const GUEST_PENDING_SUBMISSION_KEY = "guest_pending_submission";

export type GuestPendingSubmission = {
  selectedMood: string;
  selectedPersona: string;
  sessionPurpose?: string;
  keyword?: string;
  textInput: string;
  inputMode?: "voice" | "text";
  createdAt?: number;
  audioBase64?: string; // data:audio/...;base64,...
  audioLost?: boolean;
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

export function saveGuestPendingSubmission(data: GuestPendingSubmission) {
  safeSet(
    GUEST_PENDING_SUBMISSION_KEY,
    JSON.stringify({
      ...data,
      inputMode: data.inputMode ?? "text",
      createdAt: data.createdAt ?? Date.now(),
    })
  );
}

export function getGuestPendingSubmission(): GuestPendingSubmission | null {
  const raw = safeGet(GUEST_PENDING_SUBMISSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuestPendingSubmission;
    return {
      ...parsed,
      inputMode: parsed.inputMode ?? "text",
    };
  } catch {
    return null;
  }
}

export function clearGuestPendingSubmission() {
  safeRemove(GUEST_PENDING_SUBMISSION_KEY);
}

export function updateGuestPendingSubmission(partial: Partial<GuestPendingSubmission>) {
  const existing = getGuestPendingSubmission();
  if (!existing) return;
  saveGuestPendingSubmission({ ...existing, ...partial });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
