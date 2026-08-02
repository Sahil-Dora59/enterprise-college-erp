import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { applicantAccountsTable, applicantSessionsTable, db } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken, TOKEN_TTL_SECONDS, verifyToken } from "../lib/jwt";

const router: IRouter = Router();
const resetTokens = new Map<string, { applicantId: number; expiresAt: number }>();
const strong = (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);

router.post("/applicants/register", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9\s-]{8,20}$/.test(phone) || !strong(password)) {
    res.status(400).json({ error: "Enter a valid email, phone number, and password with uppercase, lowercase, and number." }); return;
  }
  const [existing] = await db.select().from(applicantAccountsTable).where(eq(applicantAccountsTable.email, email));
  if (existing) { res.status(409).json({ error: "An applicant account already exists for this email." }); return; }
  const token = crypto.randomBytes(32).toString("hex");
  const [account] = await db.insert(applicantAccountsTable).values({ email, phone, passwordHash: await hashPassword(password), emailVerificationToken: token, emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }).returning();
  res.status(201).json({ id: account.id, email: account.email, emailVerificationRequired: true });
});

router.post("/applicants/login", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const [account] = await db.select().from(applicantAccountsTable).where(eq(applicantAccountsTable.email, email));
  if (!account || !(await verifyPassword(String(req.body?.password ?? ""), account.passwordHash))) { res.status(401).json({ error: "Invalid applicant credentials" }); return; }
  const tokenId = crypto.randomUUID();
  const token = signToken({ userId: account.id, email: account.email, role: "applicant" }, tokenId);
  await db.insert(applicantSessionsTable).values({ applicantId: account.id, tokenId, expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000) });
  res.json({ token, applicant: { id: account.id, email: account.email, emailVerified: account.emailVerified, phoneVerified: account.phoneVerified } });
});

router.post("/applicants/forgot-password", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const [account] = await db.select().from(applicantAccountsTable).where(eq(applicantAccountsTable.email, email));
  if (account) resetTokens.set(crypto.randomBytes(32).toString("hex"), { applicantId: account.id, expiresAt: Date.now() + 15 * 60 * 1000 });
  res.json({ message: "If an account exists, reset instructions have been requested." });
});

router.post("/applicants/reset-password", async (req, res): Promise<void> => {
  const entry = resetTokens.get(req.body?.token);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!entry || entry.expiresAt < Date.now() || !strong(password)) { res.status(400).json({ error: "Reset token is invalid or expired, or password is too weak." }); return; }
  await db.update(applicantAccountsTable).set({ passwordHash: await hashPassword(password) }).where(eq(applicantAccountsTable.id, entry.applicantId)); resetTokens.delete(req.body.token);
  res.json({ message: "Applicant password reset successfully." });
});

router.get("/applicants/verify-email", async (req, res): Promise<void> => {
  const token = String(req.query.token ?? "");
  const [account] = await db.select().from(applicantAccountsTable).where(and(eq(applicantAccountsTable.emailVerificationToken, token), gt(applicantAccountsTable.emailVerificationExpiresAt, new Date())));
  if (!account) { res.status(400).json({ error: "Verification token is invalid or expired." }); return; }
  await db.update(applicantAccountsTable).set({ emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null }).where(eq(applicantAccountsTable.id, account.id)); res.json({ message: "Email verified." });
});

router.post("/applicants/logout", async (req, res): Promise<void> => {
  const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/, "");
  try { const payload = verifyToken(token); await db.update(applicantSessionsTable).set({ revokedAt: new Date() }).where(and(eq(applicantSessionsTable.tokenId, payload.jti), isNull(applicantSessionsTable.revokedAt))); } catch { /* logout remains idempotent */ }
  res.json({ message: "Applicant session closed." });
});

export default router;