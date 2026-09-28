export const AUTH_TOKEN_KEY = "erp_token";
export const DEMO_SESSION_KEY = "erp_demo_session";

export interface AuthStorage {
  localStorage: Pick<Storage, "getItem" | "removeItem" | "setItem">;
  sessionStorage: Pick<Storage, "getItem" | "removeItem" | "setItem">;
}

export function getBrowserAuthStorage(): AuthStorage {
  return {
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
  };
}

export function readStoredAuthToken(storage: AuthStorage): string | null {
  return (
    storage.localStorage.getItem(AUTH_TOKEN_KEY) ??
    storage.sessionStorage.getItem(AUTH_TOKEN_KEY)
  );
}

export function hasRememberedAuthToken(storage: AuthStorage): boolean {
  return Boolean(storage.localStorage.getItem(AUTH_TOKEN_KEY));
}

export function persistAuthToken(
  token: string,
  rememberMe: boolean,
  storage: AuthStorage,
): void {
  storage.localStorage.removeItem(AUTH_TOKEN_KEY);
  storage.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  (rememberMe ? storage.localStorage : storage.sessionStorage).setItem(
    AUTH_TOKEN_KEY,
    token,
  );
}

export function clearAuthSession(storage: AuthStorage): void {
  storage.localStorage.removeItem(AUTH_TOKEN_KEY);
  storage.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  storage.localStorage.removeItem(DEMO_SESSION_KEY);
}

export function shouldClearAuthFromStorageEvent(event: {
  key: string | null;
  newValue: string | null;
}): boolean {
  return event.key === AUTH_TOKEN_KEY && !event.newValue;
}

export function shouldClearInvalidSession(args: {
  token: string | null;
  isLoading: boolean;
  user: unknown;
}): boolean {
  return Boolean(args.token && !args.isLoading && !args.user);
}

export async function logoutWithCleanup(
  token: string | null,
  requestLogout: () => Promise<unknown>,
  clearSession: () => void,
): Promise<void> {
  try {
    if (token) await requestLogout();
  } catch {
    // Local cleanup must still happen when the server session is unavailable.
  } finally {
    clearSession();
  }
}