const STORAGE_KEY = "ledger_session";
const USERNAME_KEY = "ledger_username";

export interface SessionData {
  userId: string;
  username: string;
  displayName?: string | null;
  createdAt: number;
}

export function getStoredSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionData;
    if (!data.userId || !data.username) return null;
    return data;
  } catch {
    return null;
  }
}

export function setStoredSession(session: SessionData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getStoredUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function setStoredUsername(username: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERNAME_KEY, username);
}

/** Check if username exists (identity step). Uses API route so profile table stays server-only. */
export async function checkUsernameExists(username: string): Promise<boolean> {
  const res = await fetch("/api/auth/check-username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username.trim().toLowerCase() }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { exists?: boolean };
  return !!data.exists;
}

/** Verify PIN and return session. Call API route that hashes PIN server-side. */
export async function verifyPin(username: string, pin: string): Promise<SessionData | null> {
  const res = await fetch("/api/auth/verify-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username.trim().toLowerCase(), pin }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { userId: string; username: string; displayName?: string | null };
  const session: SessionData = {
    userId: data.userId,
    username: data.username,
    displayName: data.displayName,
    createdAt: Date.now(),
  };
  setStoredSession(session);
  setStoredUsername(data.username);
  return session;
}
