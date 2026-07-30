import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";
import { getUserPermissions, permissionForRequest, type PermissionKey } from "../lib/rbac";
import { authSessionsTable, db, usersTable } from "@workspace/db";
import { and, eq, gt, isNull } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const tokenUser = verifyToken(token);
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, tokenUser.userId));
    if (!user || !user.isActive || user.email !== tokenUser.email) {
      res.status(401).json({ error: "Invalid or inactive account" });
      return;
    }
    const [session] = await db
      .select({ id: authSessionsTable.id })
      .from(authSessionsTable)
      .where(
        and(
          eq(authSessionsTable.tokenId, tokenUser.jti),
          eq(authSessionsTable.userId, user.id),
          isNull(authSessionsTable.revokedAt),
          gt(authSessionsTable.expiresAt, new Date()),
        ),
      );
    if (!session) {
      res.status(401).json({ error: "Session expired or revoked" });
      return;
    }
    await db
      .update(authSessionsTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(authSessionsTable.id, session.id));
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti: tokenUser.jti,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export async function authorizeRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const permission = permissionForRequest(req.path, req.method);
  if (!permission) {
    next();
    return;
  }
  try {
    const permissions = await getUserPermissions(req.user.userId);
    if (!permissions.includes(permission as PermissionKey)) {
      res.status(403).json({ error: "Access denied", permission });
      return;
    }
  } catch {
    res.status(503).json({ error: "Authorization service unavailable" });
    return;
  }
  next();
}
