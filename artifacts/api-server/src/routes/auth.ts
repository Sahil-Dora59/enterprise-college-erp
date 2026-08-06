import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { authSessionsTable, db, refreshTokensTable, usersTable } from "@workspace/db";
import { LoginBody, ChangePasswordBody } from "@workspace/api-zod";
import { REMEMBER_ME_REFRESH_TTL_SECONDS, SESSION_REFRESH_TTL_SECONDS, signToken, TOKEN_TTL_SECONDS, verifyToken } from "../lib/jwt";
import { verifyPassword, hashPassword } from "../lib/password";
import { authenticate } from "../middlewares/auth";
import { getUserWithPermissions } from "../lib/rbac";

const router: IRouter = Router();
const failedLogins = new Map<string, { count: number; lockedUntil: number }>();
const resetTokens = new Map<string, { userId: number; expiresAt: number }>();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const headerValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const userAgentParts = (value: string | undefined) => {
  const ua = value ?? "";
  return {
    browser: ua.match(/(Edg|Chrome|Firefox|Safari|Opera)\/[\d.]+/)?.[1] ?? "unknown",
    platform: ua.match(/\(([^;)]+)(?:;[^)]*)?\)/)?.[1] ?? "unknown",
  };
};

function issueRefreshToken(userId: number, sessionId: number, rememberMe: boolean) {
  const token = crypto.randomBytes(48).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + (rememberMe ? REMEMBER_ME_REFRESH_TTL_SECONDS : SESSION_REFRESH_TTL_SECONDS) * 1000),
  };
}

function strongPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { email, password } = parsed.data;
    const rememberMe = req.body?.rememberMe !== false;
    const key = email.trim().toLowerCase();
    const attempt = failedLogins.get(key);
    if (attempt?.lockedUntil && attempt.lockedUntil > Date.now()) {
      res.status(429).json({ error: "Account temporarily locked after repeated failed attempts. Try again later." });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, key));

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      const next = { count: (attempt?.count ?? 0) + 1, lockedUntil: 0 };
      if (next.count >= MAX_FAILURES) next.lockedUntil = Date.now() + LOCKOUT_MS;
      failedLogins.set(key, next);
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    failedLogins.delete(key);

    if (!user.isActive) {
      res.status(401).json({ error: "Account is inactive. Contact administrator." });
      return;
    }

    const tokenId = crypto.randomUUID();
    const token = signToken(
      { userId: user.id, email: user.email, role: user.role },
      tokenId,
    );

    const device = userAgentParts(headerValue(req.headers["user-agent"]));
    const [session] = await db.insert(authSessionsTable).values({
      userId: user.id,
      tokenId,
      expiresAt: new Date(Date.now() + (rememberMe ? REMEMBER_ME_REFRESH_TTL_SECONDS : SESSION_REFRESH_TTL_SECONDS) * 1000),
      browser: device.browser,
      platform: device.platform,
      ipAddress: req.ip,
      rememberMe,
    }).returning({ id: authSessionsTable.id });
    const refresh = issueRefreshToken(user.id, session.id, rememberMe);
    await db.insert(refreshTokensTable).values({
      userId: user.id,
      sessionId: session.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      rememberMe,
    });

    const safeUser = await getUserWithPermissions(user.id);

    res.json({
      token,
      refreshToken: refresh.token,
      expiresIn: TOKEN_TTL_SECONDS,
      user: {
        ...safeUser,
        createdAt: safeUser!.createdAt.toISOString(),
      },
    });
  } catch (err) {
    req.log?.error({ err }, "Login failed unexpectedly");
    res.status(500).json({ error: "Unable to sign in right now. Please try again later." });
  }
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const rawToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
  if (!rawToken) { res.status(401).json({ error: "Refresh token required" }); return; }
  const [stored] = await db.select().from(refreshTokensTable).where(and(
    eq(refreshTokensTable.tokenHash, hashToken(rawToken)),
    isNull(refreshTokensTable.revokedAt),
  ));
  if (!stored || stored.expiresAt <= new Date()) { res.status(401).json({ error: "Refresh token expired or revoked" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, stored.userId));
  const [session] = await db.select().from(authSessionsTable).where(and(eq(authSessionsTable.id, stored.sessionId), isNull(authSessionsTable.revokedAt)));
  if (!user?.isActive || !session || session.expiresAt <= new Date()) { res.status(401).json({ error: "Session expired or revoked" }); return; }
  const tokenId = crypto.randomUUID();
  const token = signToken({ userId: user.id, email: user.email, role: user.role }, tokenId);
  const nextRefresh = issueRefreshToken(user.id, session.id, stored.rememberMe);
  await db.transaction(async (tx) => {
    await tx.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.id, stored.id));
    await tx.insert(refreshTokensTable).values({ userId: user.id, sessionId: session.id, tokenHash: nextRefresh.tokenHash, expiresAt: nextRefresh.expiresAt, rememberMe: stored.rememberMe });
    await tx.update(authSessionsTable).set({ tokenId, lastSeenAt: new Date(), expiresAt: new Date(Date.now() + (stored.rememberMe ? REMEMBER_ME_REFRESH_TTL_SECONDS : SESSION_REFRESH_TTL_SECONDS) * 1000) }).where(eq(authSessionsTable.id, session.id));
  });
  res.json({ token, refreshToken: nextRefresh.token, expiresIn: TOKEN_TTL_SECONDS });
});

router.post("/auth/logout", authenticate, async (req, res): Promise<void> => {
  if (req.user?.jti) {
    await db
      .update(authSessionsTable)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessionsTable.tokenId, req.user.jti), isNull(authSessionsTable.revokedAt)));
  }
  if (req.user?.jti) {
    const [session] = await db.select({ id: authSessionsTable.id }).from(authSessionsTable).where(eq(authSessionsTable.tokenId, req.user.jti));
    if (session) await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(and(eq(refreshTokensTable.sessionId, session.id), isNull(refreshTokensTable.revokedAt)));
  }
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/sessions", authenticate, async (req, res): Promise<void> => {
  const sessions = await db.select({ id: authSessionsTable.id, browser: authSessionsTable.browser, platform: authSessionsTable.platform, ipAddress: authSessionsTable.ipAddress, createdAt: authSessionsTable.createdAt, lastSeenAt: authSessionsTable.lastSeenAt, expiresAt: authSessionsTable.expiresAt, revokedAt: authSessionsTable.revokedAt }).from(authSessionsTable).where(eq(authSessionsTable.userId, req.user!.userId));
  res.json(sessions);
});

router.delete("/auth/sessions/:id", authenticate, async (req, res): Promise<void> => {
  await db.update(authSessionsTable).set({ revokedAt: new Date() }).where(and(eq(authSessionsTable.id, Number(req.params.id)), eq(authSessionsTable.userId, req.user!.userId)));
  await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(and(eq(refreshTokensTable.sessionId, Number(req.params.id)), isNull(refreshTokensTable.revokedAt)));
  res.json({ message: "Session revoked" });
});

router.post("/auth/logout-all", authenticate, async (req, res): Promise<void> => {
  await db.update(authSessionsTable).set({ revokedAt: new Date() }).where(and(eq(authSessionsTable.userId, req.user!.userId), isNull(authSessionsTable.revokedAt)));
  await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(and(eq(refreshTokensTable.userId, req.user!.userId), isNull(refreshTokensTable.revokedAt)));
  res.json({ message: "All sessions revoked" });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const safeUser = await getUserWithPermissions(user.id);
  res.json({ ...safeUser, createdAt: safeUser!.createdAt.toISOString(), mustChangePassword: user.mustChangePassword, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified });
});

router.post("/auth/change-password", authenticate, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  if (!strongPassword(newPassword)) {
    res.status(400).json({ error: "Password must be at least 8 characters and include uppercase, lowercase, and a number." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash, mustChangePassword: false }).where(eq(usersTable.id, user.id));
  await db
    .update(authSessionsTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessionsTable.userId, user.id),
        isNull(authSessionsTable.revokedAt),
        ne(authSessionsTable.tokenId, req.user!.jti),
      ),
    );
  res.json({ message: "Password changed successfully" });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (email) {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + RESET_TTL_MS });
      // Delivery is intentionally provider-neutral; production mail delivery can consume this event.
      console.info("Password reset requested", { userId: user.id });
    }
  }
  res.json({ message: "If an account exists for that email, password reset instructions have been requested." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const reset = resetTokens.get(token);
  if (!reset || reset.expiresAt <= Date.now()) {
    resetTokens.delete(token);
    res.status(400).json({ error: "Reset link is invalid or expired." });
    return;
  }
  if (!strongPassword(password)) {
    res.status(400).json({ error: "Password must be at least 8 characters and include uppercase, lowercase, and a number." });
    return;
  }
  await db.update(usersTable).set({ passwordHash: await hashPassword(password) }).where(eq(usersTable.id, reset.userId));
  await db.update(authSessionsTable).set({ revokedAt: new Date() }).where(and(eq(authSessionsTable.userId, reset.userId), isNull(authSessionsTable.revokedAt)));
  resetTokens.delete(token);
  res.json({ message: "Password reset successfully. Please sign in again." });
});

export default router;
