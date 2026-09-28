import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AUTH_TOKEN_KEY,
  DEMO_SESSION_KEY,
  type AuthStorage,
  clearAuthSession,
  hasRememberedAuthToken,
  logoutWithCleanup,
  persistAuthToken,
  readStoredAuthToken,
  shouldClearAuthFromStorageEvent,
  shouldClearInvalidSession,
} from "../src/lib/auth-session.ts";
import {
  getGetMeUrl,
  getLoginUrl,
  getLogoutUrl,
  getMe,
  setAuthTokenGetter,
} from "@workspace/api-client-react";

function createStorage(): AuthStorage {
  const createArea = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
  };

  return {
    localStorage: createArea(),
    sessionStorage: createArea(),
  };
}

test("auth tokens persist in localStorage and reload from it", () => {
  const storage = createStorage();

  persistAuthToken("local-token", true, storage);

  assert.equal(storage.localStorage.getItem(AUTH_TOKEN_KEY), "local-token");
  assert.equal(storage.sessionStorage.getItem(AUTH_TOKEN_KEY), null);
  assert.equal(readStoredAuthToken(storage), "local-token");
  assert.equal(hasRememberedAuthToken(storage), true);
});

test("remember-me disabled persists in sessionStorage only", () => {
  const storage = createStorage();
  persistAuthToken("local-token", true, storage);
  persistAuthToken("session-token", false, storage);

  assert.equal(storage.localStorage.getItem(AUTH_TOKEN_KEY), null);
  assert.equal(storage.sessionStorage.getItem(AUTH_TOKEN_KEY), "session-token");
  assert.equal(readStoredAuthToken(storage), "session-token");
  assert.equal(hasRememberedAuthToken(storage), false);
});

test("invalid-session state clears stored auth after /auth/me stops loading", () => {
  const storage = createStorage();
  persistAuthToken("expired-token", true, storage);

  assert.equal(
    shouldClearInvalidSession({
      token: readStoredAuthToken(storage),
      isLoading: false,
      user: null,
    }),
    true,
  );
  assert.equal(
    shouldClearInvalidSession({
      token: "expired-token",
      isLoading: true,
      user: null,
    }),
    false,
  );
  assert.equal(
    shouldClearInvalidSession({
      token: "valid-token",
      isLoading: false,
      user: { id: 1 },
    }),
    false,
  );

  clearAuthSession(storage);
  assert.equal(readStoredAuthToken(storage), null);
});

test("logout cleanup removes both token locations and demo state", () => {
  const storage = createStorage();
  persistAuthToken("token", true, storage);
  storage.localStorage.setItem(DEMO_SESSION_KEY, "demo");

  clearAuthSession(storage);

  assert.equal(storage.localStorage.getItem(AUTH_TOKEN_KEY), null);
  assert.equal(storage.sessionStorage.getItem(AUTH_TOKEN_KEY), null);
  assert.equal(storage.localStorage.getItem(DEMO_SESSION_KEY), null);
});

test("storage events clear auth only when the token is removed", () => {
  assert.equal(
    shouldClearAuthFromStorageEvent({ key: AUTH_TOKEN_KEY, newValue: null }),
    true,
  );
  assert.equal(
    shouldClearAuthFromStorageEvent({ key: AUTH_TOKEN_KEY, newValue: "new-token" }),
    false,
  );
  assert.equal(
    shouldClearAuthFromStorageEvent({ key: "other-key", newValue: null }),
    false,
  );
});

test("logout cleanup runs when the server logout request fails", async () => {
  let requestCount = 0;
  let clearCount = 0;

  await logoutWithCleanup(
    "token",
    async () => {
      requestCount += 1;
      throw new Error("server unavailable");
    },
    () => {
      clearCount += 1;
    },
  );

  await logoutWithCleanup(
    null,
    async () => {
      requestCount += 1;
    },
    () => {
      clearCount += 1;
    },
  );

  assert.equal(requestCount, 1);
  assert.equal(clearCount, 2);
});

test("auth client uses /api routes and attaches the bearer token", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  setAuthTokenGetter(() => "browser-token");
  globalThis.fetch = async (input, init) => {
    requests.push({ input, init });
    return new Response(JSON.stringify({ id: 1, email: "test@example.test" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    await getMe();
  } finally {
    globalThis.fetch = originalFetch;
    setAuthTokenGetter(null);
  }

  assert.equal(getLoginUrl(), "/api/auth/login");
  assert.equal(getLogoutUrl(), "/api/auth/logout");
  assert.equal(getGetMeUrl(), "/api/auth/me");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].input, "/api/auth/me");
  assert.equal(
    new Headers(requests[0].init?.headers).get("authorization"),
    "Bearer browser-token",
  );
});