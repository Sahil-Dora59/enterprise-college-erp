import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, permissionsTable, rolePermissionsTable, rolesTable } from "@workspace/db";
import { authenticate, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/roles", authenticate, requireRole("super_admin"), async (_req, res): Promise<void> => {
  const roles = await db.select().from(rolesTable).orderBy(asc(rolesTable.name));
  const assignments = await db
    .select({ roleId: rolePermissionsTable.roleId, permissionId: rolePermissionsTable.permissionId })
    .from(rolePermissionsTable);
  const permissions = await db.select().from(permissionsTable).orderBy(asc(permissionsTable.module), asc(permissionsTable.action));
  res.json(roles.map((role) => ({
    ...role,
    permissions: assignments.filter((item) => item.roleId === role.id).map((item) => item.permissionId),
  })));
});

router.get("/permissions", authenticate, requireRole("super_admin"), async (_req, res): Promise<void> => {
  res.json(await db.select().from(permissionsTable).orderBy(asc(permissionsTable.module), asc(permissionsTable.action)));
});

router.put("/roles/:id/permissions", authenticate, requireRole("super_admin"), async (req, res): Promise<void> => {
  const roleId = Number(req.params.id);
  const permissionIds: number[] = Array.isArray(req.body?.permissionIds)
    ? req.body.permissionIds.map(Number).filter((value: number) => Number.isInteger(value))
    : [];
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId));
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, roleId));
  if (permissionIds.length > 0) {
    await db.insert(rolePermissionsTable).values(permissionIds.map((permissionId) => ({ roleId, permissionId }))).onConflictDoNothing();
  }
  res.json({ message: "Role permissions updated", roleId, permissionIds });
});

export default router;