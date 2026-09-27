import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { configureTestEnvironment, jsonBody, startRouterServer } from "./helpers.ts";

configureTestEnvironment();

const { signToken, verifyToken, TOKEN_AUDIENCE, TOKEN_ISSUER } =
  await import("../src/lib/jwt.ts");
const { hashPassword, verifyPassword } = await import("../src/lib/password.ts");
const { default: authRouter } = await import("../src/routes/auth.ts");

let server: Awaited<ReturnType<typeof startRouterServer>>;

before(async () => {
  server = await startRouterServer(authRouter);
});

after(async () => {
  await server.close();
});

test("valid signed authentication credentials round-trip", () => {
  const token = signToken({
    userId: 101,
    email: "student@example.test",
    role: "student",
  }, "00000000-0000-4000-8000-000000000101");

  const payload = verifyToken(token);

  assert.equal(payload.userId, 101);
  assert.equal(payload.email, "student@example.test");
  assert.equal(payload.role, "student");
  assert.equal(payload.jti, "00000000-0000-4000-8000-000000000101");
  assert.equal(payload.iss, TOKEN_ISSUER);
  assert.equal(payload.aud, TOKEN_AUDIENCE);
});

test("tampered and expired authentication credentials are rejected", async () => {
  const token = signToken({
    userId: 101,
    email: "student@example.test",
    role: "student",
  });

  assert.throws(() => verifyToken(`${token}tampered`));

  const jwt = (await import("jsonwebtoken")).default;
  const expiredToken = jwt.sign(
    {
      userId: 101,
      email: "student@example.test",
      role: "student",
      jti: "expired-token-id",
    },
    "task-2-local-test-secret",
    {
      expiresIn: -1,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      algorithm: "HS256",
    },
  );

  assert.throws(() => verifyToken(expiredToken));
});

test("password hashing verifies the original password only", async () => {
  const hash = await hashPassword("ValidPassword123");

  assert.equal(await verifyPassword("ValidPassword123", hash), true);
  assert.equal(await verifyPassword("WrongPassword123", hash), false);
});

test("protected auth endpoint rejects an unauthenticated request", async () => {
  const response = await server.request("/auth/me");

  assert.equal(response.status, 401);
  assert.deepEqual(await jsonBody(response), { error: "Unauthorized" });
});

test("protected auth endpoint rejects malformed credentials", async () => {
  const response = await server.request("/auth/me", {
    headers: { authorization: "Bearer not-a-token" },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await jsonBody(response), { error: "Invalid or expired token" });
});

test("login validation rejects an invalid request before database access", async () => {
  const response = await server.request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email" }),
  });

  assert.equal(response.status, 400);
  const body = await jsonBody(response);
  assert.equal(typeof body.error, "string");
});