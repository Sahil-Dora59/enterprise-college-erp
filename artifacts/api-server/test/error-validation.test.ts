import assert from "node:assert/strict";
import { test } from "node:test";
import { configureTestEnvironment } from "./helpers.ts";

configureTestEnvironment();

const { errorHandler, notFoundHandler } =
  await import("../src/middlewares/errorHandler.ts");

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

test("malformed JSON errors are sanitized", () => {
  const result = responseRecorder();
  const syntaxError = Object.assign(new SyntaxError("parser internals"), { body: "bad" });

  errorHandler(
    syntaxError,
    { id: "request-1" } as never,
    result.response as never,
    (() => undefined) as never,
  );

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body, {
    error: "Malformed JSON request body",
    requestId: "request-1",
  });
});

test("validation errors expose safe paths and messages only", () => {
  const result = responseRecorder();

  errorHandler(
    {
      issues: [
        { path: ["email"], message: "Invalid email" },
        { path: ["password"], message: "Required" },
      ],
    },
    { id: "request-2" } as never,
    result.response as never,
    (() => undefined) as never,
  );

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body, {
    error: "Request validation failed",
    details: [
      { path: ["email"], message: "Invalid email" },
      { path: ["password"], message: "Required" },
    ],
    requestId: "request-2",
  });
});

test("unexpected errors do not expose internal details", () => {
  const result = responseRecorder();

  errorHandler(
    new Error("database password and query details"),
    { id: "request-3", method: "GET", originalUrl: "/api/test" } as never,
    result.response as never,
    (() => undefined) as never,
  );

  assert.equal(result.statusCode, 500);
  assert.deepEqual(result.body, {
    error: "Internal server error",
    requestId: "request-3",
  });
});

test("missing API routes return a stable not-found response", () => {
  const result = responseRecorder();

  notFoundHandler(
    { id: "request-4" } as never,
    result.response as never,
    (() => undefined) as never,
  );

  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body, {
    error: "Not found",
    requestId: "request-4",
  });
});