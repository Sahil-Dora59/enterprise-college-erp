import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { and, desc, eq, isNull, ne, lt } from "drizzle-orm";
import { authSessionsTable, db, emailVerificationTokensTable, passwordHistoryTable, recoveryCodesTable, refreshTokensTable, usersTable } from "@workspace/db";
import { LoginBody, ChangePasswordBody } from "@workspace/api-zod";
import { REMEMBER_ME_REFRESH_TTL_SECONDS, SESSION_REFRESH_TTL_SECONDS, signToken, TOKEN_TTL_SECONDS, verifyToken } from "../lib/jwt";
import { verifyPassword, hashPassword } from "../lib/password";
import { authenticate } from "../middlewares/auth";
import { getUserWithPermissions } from "../lib/rbac";

const router: IRouter = Router();
const failedLogins = new Map<string, { count: number; lockedUntil: number }>();
const resetTokens = new Map<string, { userId: number; expiresAt: number }>();
const RESET_TTL_MS = 15 * 60 * 1000;
const VERIFICATION_TTL_MS = Number(process.env.EMAIL_VERIFICATION_TTL_MS ?? 24 * 60 * 60 * 1000);
const PASSWORD_MAX_AGE_MS = Number(process.env.PASSWORD_MAX_AGE_MS ?? 90 * 24 * 60 * 60 * 1000);
const PASSWORD_HISTORY_LIMIT = Number(process.env.PASSWORD_HISTORY_LIMIT ?? 5);
const MAX_FAILURES = Number(process.env.MAX_LOGIN_FAILURES ?? 5);
const LOCKOUT_MS = Number(process.env.LOGIN_LOCKOUT_MS ?? 15 * 60 * 1000);
const PERMANENT_LOCK_FAILURES = Number(process.env.PERMANENT_LOCK_FAILURES ?? 15);
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

function randomSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function passwordExpired(changedAt: Date | null) {
  return !changedAt || changedAt.getTime() + PASSWORD_MAX_AGE_MS <= Date.now();
}

async function issueVerificationToken(userId: number) {
  const token = randomSecret();
  await db.insert(emailVerificationTokensTable).values({
    userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  });
  return token;
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

    if (user?.permanentlyLocked) {
      res.status(423).json({ error: user.lockReason ?? "Account permanently locked. Contact an administrator." });
      return;
    }
    if (user?.passwordLockedUntil && user.passwordLockedUntil > new Date()) {
      res.status(423).json({ error: user.lockReason ?? "Account temporarily locked. Try again later." });
      return;
    }
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      const next = { count: (attempt?.count ?? 0) + 1, lockedUntil: 0 };
      if (next.count >= MAX_FAILURES) next.lockedUntil = Date.now() + LOCKOUT_MS;
      failedLogins.set(key, next);
      if (user) {
        const permanent = next.count >= PERMANENT_LOCK_FAILURES;
        await db.update(usersTable).set({
          failedLoginCount: next.count,
          passwordLockedUntil: permanent ? null : new Date(next.lockedUntil),
          permanentlyLocked: permanent,
          lockReason: `Repeated failed login attempts (${next.count})`,
        }).where(eq(usersTable.id, user.id));
      }
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    failedLogins.delete(key);
    await db.update(usersTable).set({ failedLoginCount: 0, passwordLockedUntil: null, lockReason: null }).where(eq(usersTable.id, user.id));

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

    const verificationToken = !user.emailVerified ? await issueVerificationToken(user.id) : undefined;
    res.json({
      token,
      refreshToken: refresh.token,
      expiresIn: TOKEN_TTL_SECONDS,
      verificationRequired: !user.emailVerified,
      verificationToken,
      passwordExpired: passwordExpired(user.passwordChangedAt),
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

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const [entry] = await db.select().from(emailVerificationTokensTable).where(and(eq(emailVerificationTokensTable.tokenHash, hashToken(token)), isNull(emailVerificationTokensTable.usedAt)));
  if (!entry || entry.expiresAt <= new Date()) { res.status(400).json({ error: "Verification token is invalid or expired." }); return; }
  await db.transaction(async (tx) => {
    await tx.update(emailVerificationTokensTable).set({ usedAt: new Date() }).where(eq(emailVerificationTokensTable.id, entry.id));
    await tx.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, entry.userId));
  });
  res.json({ message: "Email verified successfully." });
});

router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (user && !user.emailVerified) {
    const token = await issueVerificationToken(user.id);
    res.json({ message: "Verification instructions requested.", verificationToken: token });
    return;
  }
  res.json({ message: "If the account requires verification, instructions have been requested." });
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
  const history = await db.select({ passwordHash: passwordHistoryTable.passwordHash }).from(passwordHistoryTable).where(eq(passwordHistoryTable.userId, user.id)).orderBy(desc(passwordHistoryTable.createdAt)).limit(PASSWORD_HISTORY_LIMIT);
  if (await Promise.all(history.map((entry) => verifyPassword(newPassword, entry.passwordHash))).then((matches) => matches.some(Boolean)) || await verifyPassword(newPassword, user.passwordHash)) {
    res.status(400).json({ error: "You cannot reuse a recent password." });
    return;
  }
  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.insert(passwordHistoryTable).values({ userId: user.id, passwordHash: user.passwordHash });
    await tx.delete(passwordHistoryTable).where(and(eq(passwordHistoryTable.userId, user.id), lt(passwordHistoryTable.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))));
    await tx.update(usersTable).set({ passwordHash, passwordChangedAt: new Date(), mustChangePassword: false }).where(eq(usersTable.id, user.id));
  });
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
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, reset.userId));
  if (!user) { res.status(400).json({ error: "Reset link is invalid or expired." }); return; }
  const history = await db.select({ passwordHash: passwordHistoryTable.passwordHash }).from(passwordHistoryTable).where(eq(passwordHistoryTable.userId, user.id)).limit(PASSWORD_HISTORY_LIMIT);
  if (await Promise.all([user.passwordHash, ...history.map((entry) => entry.passwordHash)].map((hash) => verifyPassword(password, hash))).then((matches) => matches.some(Boolean))) {
    res.status(400).json({ error: "You cannot reuse a recent password." }); return;
  }
  await db.transaction(async (tx) => {
    await tx.insert(passwordHistoryTable).values({ userId: user.id, passwordHash: user.passwordHash });
    await tx.update(usersTable).set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date(), mustChangePassword: false }).where(eq(usersTable.id, reset.userId));
  });
  await db.update(authSessionsTable).set({ revokedAt: new Date() }).where(and(eq(authSessionsTable.userId, reset.userId), isNull(authSessionsTable.revokedAt)));
  resetTokens.delete(token);
  res.json({ message: "Password reset successfully. Please sign in again." });
});

router.post("/auth/recovery-codes", authenticate, async (req, res): Promise<void> => {
  const codes = Array.from({ length: 10 }, () => `${randomSecret(4)}-${randomSecret(4)}`);
  await db.update(recoveryCodesTable).set({ revokedAt: new Date() }).where(and(eq(recoveryCodesTable.userId, req.user!.userId), isNull(recoveryCodesTable.revokedAt)));
  await db.insert(recoveryCodesTable).values(codes.map((code) => ({ userId: req.user!.userId, codeHash: hashToken(code) })));
  res.json({ codes });
});

router.delete("/auth/recovery-codes", authenticate, async (req, res): Promise<void> => {
  await db.update(recoveryCodesTable).set({ revokedAt: new Date() }).where(and(eq(recoveryCodesTable.userId, req.user!.userId), isNull(recoveryCodesTable.revokedAt)));
  res.json({ message: "Recovery codes revoked." });
});

router.post("/auth/unlock/:userId", authenticate, async (req, res): Promise<void> => {
  if (!["super_admin", "admin"].includes(req.user!.role)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(usersTable).set({ passwordLockedUntil: null, permanentlyLocked: false, failedLoginCount: 0, lockReason: null }).where(eq(usersTable.id, Number(req.params.userId)));
  res.json({ message: "Account unlocked." });
});

export default router;
