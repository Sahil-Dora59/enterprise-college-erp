import assert from "node:assert/strict";
import { test } from "node:test";
import { configureTestEnvironment } from "./helpers.ts";

configureTestEnvironment();

const { PERMISSIONS, permissionForRequest } = await import("../src/lib/rbac.ts");
const { authorizeRequest, requireRole } = await import("../src/middlewares/auth.ts");

function responseRecorder() {
  let statusCode = 200;
  let body: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
  };
  return {
    response,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

test("central permission mapping distinguishes read and write access", () => {
  assert.equal(permissionForRequest("/students", "GET"), PERMISSIONS.studentsView);
  assert.equal(permissionForRequest("/students/101", "PATCH"), PERMISSIONS.studentsManage);
  assert.equal(permissionForRequest("/dashboard/stats", "GET"), PERMISSIONS.dashboardView);
  assert.equal(permissionForRequest("/not-a-protected-module", "GET"), null);
});

test("role authorization returns 401 without an authenticated user", () => {
  const result = responseRecorder();
  let nextCalled = false;

  requireRole("admin")(
    {} as never,
    result.response as never,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, { error: "Unauthorized" });
  assert.equal(nextCalled, false);
});

test("role authorization returns 403 for an authenticated but unauthorized role", () => {
  const result = responseRecorder();
  let nextCalled = false;

  requireRole("admin")(
    { user: { role: "student" } } as never,
    result.response as never,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.body, { error: "Forbidden" });
  assert.equal(nextCalled, false);
});

test("role authorization allows an authorized role to continue", () => {
  const result = responseRecorder();
  let nextCalled = false;

  requireRole("admin", "faculty")(
    { user: { role: "faculty" } } as never,
    result.response as never,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(result.statusCode, 200);
  assert.equal(nextCalled, true);
});

test("central permission middleware rejects requests without authentication", async () => {
  const result = responseRecorder();
  let nextCalled = false;

  await authorizeRequest(
    { path: "/students", method: "GET" } as never,
    result.response as never,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, { error: "Unauthorized" });
  assert.equal(nextCalled, false);
});