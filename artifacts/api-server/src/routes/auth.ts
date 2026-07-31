import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { authSessionsTable, db, usersTable } from "@workspace/db";
import { LoginBody, ChangePasswordBody } from "@workspace/api-zod";
import { signToken, TOKEN_TTL_SECONDS } from "../lib/jwt";
import { verifyPassword, hashPassword } from "../lib/password";
import { authenticate } from "../middlewares/auth";
import { getUserWithPermissions } from "../lib/rbac";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: "Account is inactive. Contact administrator." });
      return;
    }

    const tokenId = crypto.randomUUID();
    const token = signToken(
      { userId: user.id, email: user.email, role: user.role },
      tokenId,
    );

    await db.insert(authSessionsTable).values({
      userId: user.id,
      tokenId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000),
    });

    const safeUser = await getUserWithPermissions(user.id);

    res.json({
      token,
      user: {
        ...safeUser,
        createdAt: safeUser!.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
});

router.post("/auth/logout", authenticate, async (req, res): Promise<void> => {
  if (req.user?.jti) {
    await db
      .update(authSessionsTable)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessionsTable.tokenId, req.user.jti), isNull(authSessionsTable.revokedAt)));
  }
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const safeUser = await getUserWithPermissions(user.id);
  res.json({ ...safeUser, createdAt: safeUser!.createdAt.toISOString() });
});

router.post("/auth/change-password", authenticate, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
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

export default router;
