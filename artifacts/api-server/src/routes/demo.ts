import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { Response } from "express";
import { db, authSessionsTable, usersTable } from "@workspace/db";
import { hashPassword } from "../lib/password";
import { signToken, TOKEN_TTL_SECONDS } from "../lib/jwt";
import { getUserWithPermissions } from "../lib/rbac";

const router: IRouter = Router();
const roles = ["super_admin", "admin", "faculty", "student", "accountant", "librarian"] as const;
const demoEnabled = () => process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";
const demoPassword = "Demo@12345";
const demoUsers = [
  { role: "super_admin", name: "Dr. Maya Iyer", email: "superadmin.demo@college.edu", department: "Administration", designation: "Super Administrator", avatarUrl: "https://i.pravatar.cc/160?img=47" },
  { role: "admin", name: "Arjun Mehta", email: "admin.demo@college.edu", department: "Administration", designation: "ERP Administrator", avatarUrl: "https://i.pravatar.cc/160?img=12" },
  { role: "faculty", name: "Dr. Priya Sharma", email: "faculty.demo@college.edu", department: "Computer Science", designation: "Associate Professor", avatarUrl: "https://i.pravatar.cc/160?img=32" },
  { role: "student", name: "Aarav Kapoor", email: "student.demo@college.edu", department: "Computer Science", designation: "B.Tech • Semester 6", avatarUrl: "https://i.pravatar.cc/160?img=11" },
  { role: "accountant", name: "Neha Verma", email: "accountant.demo@college.edu", department: "Finance", designation: "Senior Accountant", avatarUrl: "https://i.pravatar.cc/160?img=44" },
  { role: "librarian", name: "Rohan Das", email: "librarian.demo@college.edu", department: "Library Services", designation: "Chief Librarian", avatarUrl: "https://i.pravatar.cc/160?img=68" },
] as const;

async function ensureDemoUsers() {
  const passwordHash = await hashPassword(demoPassword);
  const result = [];
  for (const demo of demoUsers) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, demo.email));
    const [user] = existing
      ? await db.update(usersTable).set({ name: demo.name, role: demo.role, avatarUrl: demo.avatarUrl, isActive: true }).where(eq(usersTable.id, existing.id)).returning()
      : await db.insert(usersTable).values({ name: demo.name, email: demo.email, role: demo.role, avatarUrl: demo.avatarUrl, passwordHash }).returning();
    result.push({ ...demo, id: user.id });
  }
  return result;
}

function unavailable(res: Response) {
  res.status(404).json({ error: "Demo mode is disabled" });
}

router.get("/demo/config", async (_req, res): Promise<void> => {
  if (!demoEnabled()) { unavailable(res); return; }
  const users = await ensureDemoUsers();
  res.json({ enabled: true, roles, users });
});

router.post("/demo/switch/:role", async (req, res): Promise<void> => {
  if (!demoEnabled()) { unavailable(res); return; }
  const role = req.params.role;
  if (!roles.includes(role as typeof roles[number])) {
    res.status(400).json({ error: "Unknown demo role" });
    return;
  }
  const users = await ensureDemoUsers();
  const demo = users.find((user) => user.role === role)!;
  const tokenId = crypto.randomUUID();
  const token = signToken({ userId: demo.id, email: demo.email, role: demo.role }, tokenId);
  await db.insert(authSessionsTable).values({ userId: demo.id, tokenId, expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000) });
  const user = await getUserWithPermissions(demo.id);
  res.json({ token, user: { ...user, createdAt: user!.createdAt.toISOString() } });
});

export default router;