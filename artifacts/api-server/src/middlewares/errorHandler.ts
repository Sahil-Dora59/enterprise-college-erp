import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import { logger } from "../lib/logger";

function requestId(req: Request): string | undefined {
  return typeof req.id === "string" ? req.id : undefined;
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: "Not found",
    requestId: requestId(req),
  });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const id = requestId(req);

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Malformed JSON request body", requestId: id });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray(error.issues)
  ) {
    res.status(400).json({
      error: "Request validation failed",
      details: error.issues.map((issue: { path?: unknown; message?: unknown }) => ({
        path: Array.isArray(issue.path) ? issue.path : [],
        message: typeof issue.message === "string" ? issue.message : "Invalid value",
      })),
      requestId: id,
    });
    return;
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 600
      ? error.status
      : 500;

  logger.error(
    { err: error, requestId: id, method: req.method, url: req.originalUrl },
    "Unhandled request error",
  );

  res.status(status).json({
    error: status === 500 ? "Internal server error" : "Request failed",
    requestId: id,
  });
};