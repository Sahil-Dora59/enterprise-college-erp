import { and, eq } from "drizzle-orm";
import {
  db,
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
  studentsTable,
  usersTable,
} from "@workspace/db";

export const PERMISSIONS = {
  dashboardView: "dashboard.view",
  usersManage: "users.manage",
  rolesManage: "roles.manage",
  studentsView: "students.view",
  studentsManage: "students.manage",
  facultyView: "faculty.view",
  facultyManage: "faculty.manage",
  departmentsView: "departments.view",
  departmentsManage: "departments.manage",
  coursesView: "courses.view",
  coursesManage: "courses.manage",
  semestersView: "semesters.view",
  semestersManage: "semesters.manage",
  attendanceView: "attendance.view",
  attendanceManage: "attendance.manage",
  examinationsView: "examinations.view",
  examinationsManage: "examinations.manage",
  marksView: "marks.view",
  marksManage: "marks.manage",
  assignmentsView: "assignments.view",
  assignmentsManage: "assignments.manage",
  libraryView: "library.view",
  libraryManage: "library.manage",
  feesView: "fees.view",
  feesManage: "fees.manage",
  noticesView: "notices.view",
  noticesManage: "notices.manage",
  settingsManage: "settings.manage",
  aiView: "ai.view",
  aiManage: "ai.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export async function getUserPermissions(userId: number): Promise<string[]> {
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return [];
  const rows = await db
    .select({ key: permissionsTable.key })
    .from(rolesTable)
    .innerJoin(rolePermissionsTable, eq(rolePermissionsTable.roleId, rolesTable.id))
    .innerJoin(permissionsTable, eq(permissionsTable.id, rolePermissionsTable.permissionId))
    .where(eq(rolesTable.name, user.role));
  return rows.map((row) => row.key);
}

export async function getUserWithPermissions(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;
  const permissions = await getUserPermissions(userId);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { ...safeUser, permissions };
}

export async function getStudentIdForUser(userId: number): Promise<number | null> {
  const [student] = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(eq(studentsTable.userId, userId));
  return student?.id ?? null;
}

export function permissionForRequest(path: string, method: string): PermissionKey | null {
  const normalized = path.replace(/\/+$/, "") || "/";
  const write = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (normalized === "/dashboard" || normalized.startsWith("/dashboard/")) return PERMISSIONS.dashboardView;
  if (normalized === "/users" || normalized.startsWith("/users/")) return PERMISSIONS.usersManage;
  if (normalized === "/roles" || normalized.startsWith("/permissions")) return PERMISSIONS.rolesManage;
  if (normalized === "/students" || normalized.startsWith("/students/")) return write ? PERMISSIONS.studentsManage : PERMISSIONS.studentsView;
  if (normalized === "/faculty" || normalized.startsWith("/faculty/")) return write ? PERMISSIONS.facultyManage : PERMISSIONS.facultyView;
  if (normalized === "/departments" || normalized.startsWith("/departments/")) return write ? PERMISSIONS.departmentsManage : PERMISSIONS.departmentsView;
  if (normalized === "/courses" || normalized.startsWith("/courses/")) return write ? PERMISSIONS.coursesManage : PERMISSIONS.coursesView;
  if (normalized === "/semesters" || normalized.startsWith("/semesters/")) return write ? PERMISSIONS.semestersManage : PERMISSIONS.semestersView;
  if (normalized === "/attendance" || normalized.startsWith("/attendance/")) return write ? PERMISSIONS.attendanceManage : PERMISSIONS.attendanceView;
  if (normalized === "/examinations" || normalized.startsWith("/examinations/")) return write ? PERMISSIONS.examinationsManage : PERMISSIONS.examinationsView;
  if (normalized === "/marks" || normalized.startsWith("/marks/")) return write ? PERMISSIONS.marksManage : PERMISSIONS.marksView;
  if (normalized === "/assignments" || normalized.startsWith("/assignments/")) return write ? PERMISSIONS.assignmentsManage : PERMISSIONS.assignmentsView;
  if (normalized === "/library" || normalized.startsWith("/library/") || normalized.startsWith("/books") || normalized.startsWith("/borrows")) return write ? PERMISSIONS.libraryManage : PERMISSIONS.libraryView;
  if (normalized === "/fees" || normalized.startsWith("/fees/")) return write ? PERMISSIONS.feesManage : PERMISSIONS.feesView;
  if (normalized === "/notices" || normalized.startsWith("/notices/")) return write ? PERMISSIONS.noticesManage : PERMISSIONS.noticesView;
  if (normalized === "/settings" || normalized.startsWith("/settings/")) return PERMISSIONS.settingsManage;
  if (normalized === "/ai/settings" || normalized.startsWith("/ai/settings/")) return PERMISSIONS.aiManage;
  if (normalized === "/ai" || normalized.startsWith("/ai/")) return PERMISSIONS.aiView;
  return null;
}