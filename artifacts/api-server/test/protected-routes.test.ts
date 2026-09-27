import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { configureTestEnvironment, jsonBody, startRouterServer } from "./helpers.ts";

configureTestEnvironment();

const { default: studentsRouter } = await import("../src/routes/students.ts");

let server: Awaited<ReturnType<typeof startRouterServer>>;

before(async () => {
  server = await startRouterServer(studentsRouter);
});

after(async () => {
  await server.close();
});

test("student information routes reject unauthenticated access before persistence", async () => {
  const response = await server.request("/students/1");

  assert.equal(response.status, 401);
  assert.deepEqual(await jsonBody(response), { error: "Unauthorized" });
});

test("student information routes reject unauthenticated writes", async () => {
  const response = await server.request("/students", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await jsonBody(response), { error: "Unauthorized" });
});