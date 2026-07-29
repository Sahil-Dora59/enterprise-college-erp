import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, ChangePasswordBody } from "@workspace/api-zod";
import { signToken } from "../lib/jwt";
import { verifyPassword, hashPassword } from "../lib/password";
import { authenticate } from "../middlewares/auth";
import { getUserWithPermissions } from "../lib/rbac";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!user.isActive) {
    res.status(401).json({ error: "Account is inactive. Contact administrator." });
    return;
  }
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  const safeUser = await getUserWithPermissions(user.id);
  res.json({ token, user: { ...safeUser, createdAt: safeUser!.createdAt.toISOString() } });
});

router.post("/auth/logout", (_req, res): void => {
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
  res.json({ message: "Password changed successfully" });
});

export default router;
