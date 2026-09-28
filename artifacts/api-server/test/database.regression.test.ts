import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  authSessionsTable,
  db,
  departmentsTable,
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
  semestersTable,
  studentsTable,
  usersTable,
  pool,
} from "@workspace/db";
import {
  configureTestEnvironment,
  jsonBody,
  startRouterServer,
} from "./helpers.ts";

configureTestEnvironment();

const { hashPassword } = await import("../src/lib/password.ts");
const { verifyToken } = await import("../src/lib/jwt.ts");
const { default: router } = await import("../src/routes/index.ts");

const adminPassword = "AdminPassword123";
const studentPassword = "StudentPassword123";

let server: Awaited<ReturnType<typeof startRouterServer>> | undefined;
let adminUserId: number;
let aliceUserId: number;
let bobUserId: number;
let aliceStudentId: number;
let bobStudentId: number;
let departmentId: number;
let semesterId: number;

type LoginResult = {
  token: string;
  user: Record<string, unknown>;
};

async function login(email: string, password: string): Promise<LoginResult> {
  const response = await server!.request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  const body = await jsonBody(response);
  assert.equal(typeof body.token, "string");
  assert.equal(typeof body.user, "object");
  return { token: body.token as string, user: body.user as Record<string, unknown> };
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

async function seedDatabase(): Promise<void> {
  const [department] = await db.insert(departmentsTable).values({
    name: "Computer Science",
    code: "CSE-TEST",
    description: "Deterministic isolated test department",
  }).returning({ id: departmentsTable.id });
  const [semester] = await db.insert(semestersTable).values({
    name: "Spring 2026",
    startDate: "2026-01-01",
    endDate: "2026-05-31",
    isActive: true,
  }).returning({ id: semestersTable.id });
  departmentId = department.id;
  semesterId = semester.id;

  const [adminRole] = await db.insert(rolesTable).values({
    name: "admin",
    displayName: "Administrator",
    description: "Test administrator role",
  }).returning({ id: rolesTable.id });
  const [studentRole] = await db.insert(rolesTable).values({
    name: "student",
    displayName: "Student",
    description: "Test student role",
  }).returning({ id: rolesTable.id });
  const [studentsView] = await db.insert(permissionsTable).values({
    key: "students.view",
    displayName: "View students",
    module: "students",
    action: "view",
  }).returning({ id: permissionsTable.id });
  const [studentsManage] = await db.insert(permissionsTable).values({
    key: "students.manage",
    displayName: "Manage students",
    module: "students",
    action: "manage",
  }).returning({ id: permissionsTable.id });

  await db.insert(rolePermissionsTable).values([
    { roleId: adminRole.id, permissionId: studentsView.id },
    { roleId: adminRole.id, permissionId: studentsManage.id },
    { roleId: studentRole.id, permissionId: studentsView.id },
  ]);

  const passwordHash = await hashPassword(adminPassword);
  const studentPasswordHash = await hashPassword(studentPassword);
  const [admin] = await db.insert(usersTable).values({
    name: "Test Administrator",
    email: "admin.task3b@example.test",
    passwordHash,
    role: "admin",
  }).returning({ id: usersTable.id });
  const [alice] = await db.insert(usersTable).values({
    name: "Alice Test",
    email: "alice.task3b@example.test",
    passwordHash: studentPasswordHash,
    role: "student",
  }).returning({ id: usersTable.id });
  const [bob] = await db.insert(usersTable).values({
    name: "Bob Test",
    email: "bob.task3b@example.test",
    passwordHash: studentPasswordHash,
    role: "student",
  }).returning({ id: usersTable.id });
  adminUserId = admin.id;
  aliceUserId = alice.id;
  bobUserId = bob.id;

  const [aliceStudent] = await db.insert(studentsTable).values({
    userId: aliceUserId,
    rollNumber: "T3B-ALICE",
    departmentId,
    semesterId,
    admissionDate: "2026-01-15",
    dateOfBirth: "2005-01-01",
    address: "Alice Test Address",
  }).returning({ id: studentsTable.id });
  const [bobStudent] = await db.insert(studentsTable).values({
    userId: bobUserId,
    rollNumber: "T3B-BOB",
    departmentId,
    semesterId,
    admissionDate: "2026-01-16",
    dateOfBirth: "2005-02-02",
    address: "Bob Test Address",
  }).returning({ id: studentsTable.id });
  aliceStudentId = aliceStudent.id;
  bobStudentId = bobStudent.id;
}

before(async () => {
  await seedDatabase();
  server = await startRouterServer(router);
});

after(async () => {
  await server?.close();
  await pool.end();
});

test("valid login creates a database-backed session", async () => {
  const result = await login("admin.task3b@example.test", adminPassword);

  assert.equal(result.user.email, "admin.task3b@example.test");
  assert.equal(result.user.role, "admin");
  assert.deepEqual(
    [...(result.user.permissions as string[])].sort(),
    ["students.manage", "students.view"],
  );

  const sessions = await db
    .select({
      userId: authSessionsTable.userId,
      tokenId: authSessionsTable.tokenId,
      revokedAt: authSessionsTable.revokedAt,
    })
    .from(authSessionsTable)
    .where(eq(authSessionsTable.userId, adminUserId));
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].userId, adminUserId);
  assert.equal(sessions[0].tokenId.length > 0, true);
  assert.equal(sessions[0].revokedAt, null);
});

test("authenticated users can access protected routes", async () => {
  const { token } = await login("admin.task3b@example.test", adminPassword);

  const meResponse = await server!.request("/auth/me", { headers: auth(token) });
  assert.equal(meResponse.status, 200);
  assert.equal((await jsonBody(meResponse)).email, "admin.task3b@example.test");

  const studentsResponse = await server!.request("/students", { headers: auth(token) });
  assert.equal(studentsResponse.status, 200);
  const studentsBody = await jsonBody(studentsResponse);
  assert.equal(studentsBody.total, 2);
});

test("logout revokes the database session", async () => {
  const { token } = await login("admin.task3b@example.test", adminPassword);

  const logoutResponse = await server!.request("/auth/logout", {
    method: "POST",
    headers: auth(token),
  });
  assert.equal(logoutResponse.status, 200);

  const meResponse = await server!.request("/auth/me", { headers: auth(token) });
  assert.equal(meResponse.status, 401);
  assert.deepEqual(await jsonBody(meResponse), { error: "Session expired or revoked" });

  const tokenId = verifyToken(token).jti;
  const [session] = await db
    .select({ revokedAt: authSessionsTable.revokedAt })
    .from(authSessionsTable)
    .where(eq(authSessionsTable.tokenId, tokenId));
  assert.notEqual(session?.revokedAt, null);
});

test("RBAC permits student reads and denies student writes", async () => {
  const { token, user } = await login("alice.task3b@example.test", studentPassword);
  assert.deepEqual(user.permissions, ["students.view"]);

  const readResponse = await server!.request("/students", { headers: auth(token) });
  assert.equal(readResponse.status, 200);

  const writeResponse = await server!.request("/students", {
    method: "POST",
    headers: { ...auth(token), "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(writeResponse.status, 403);
  assert.deepEqual(await jsonBody(writeResponse), {
    error: "Access denied",
    permission: "students.manage",
  });
});

test("students can only read their own student record", async () => {
  const { token } = await login("alice.task3b@example.test", studentPassword);

  const ownResponse = await server!.request(`/students/${aliceStudentId}`, {
    headers: auth(token),
  });
  assert.equal(ownResponse.status, 200);
  assert.equal((await jsonBody(ownResponse)).id, aliceStudentId);

  const otherResponse = await server!.request(`/students/${bobStudentId}`, {
    headers: auth(token),
  });
  assert.equal(otherResponse.status, 404);
  assert.deepEqual(await jsonBody(otherResponse), { error: "Student not found" });
});

test("authorized Student CRUD persists through the database", async () => {
  const { token } = await login("admin.task3b@example.test", adminPassword);
  const createResponse = await server!.request("/students", {
    method: "POST",
    headers: { ...auth(token), "content-type": "application/json" },
    body: JSON.stringify({
      name: "Created Test Student",
      email: "created.task3b@example.test",
      password: "CreatedPassword123",
      rollNumber: "T3B-CREATED",
      departmentId,
      semesterId,
      admissionDate: "2026-02-01",
      address: "Initial Address",
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = await jsonBody(createResponse);
  const createdId = created.id as number;
  const createdUserId = created.userId as number;
  assert.equal(created.rollNumber, "T3B-CREATED");

  const persisted = await db
    .select({ id: studentsTable.id, userId: studentsTable.userId })
    .from(studentsTable)
    .where(eq(studentsTable.id, createdId));
  assert.deepEqual(persisted, [{ id: createdId, userId: createdUserId }]);

  const patchResponse = await server!.request(`/students/${createdId}`, {
    method: "PATCH",
    headers: { ...auth(token), "content-type": "application/json" },
    body: JSON.stringify({ name: "Updated Test Student", address: "Updated Address" }),
  });
  assert.equal(patchResponse.status, 200);
  const updated = await jsonBody(patchResponse);
  assert.equal(updated.name, "Updated Test Student");
  assert.equal(updated.address, "Updated Address");

  const updatedUser = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, createdUserId));
  const updatedStudent = await db
    .select({ address: studentsTable.address })
    .from(studentsTable)
    .where(eq(studentsTable.id, createdId));
  assert.deepEqual(updatedUser, [{ name: "Updated Test Student" }]);
  assert.deepEqual(updatedStudent, [{ address: "Updated Address" }]);

  const deleteResponse = await server!.request(`/students/${createdId}`, {
    method: "DELETE",
    headers: auth(token),
  });
  assert.equal(deleteResponse.status, 204);

  const deleted = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(eq(studentsTable.id, createdId));
  assert.deepEqual(deleted, []);
});