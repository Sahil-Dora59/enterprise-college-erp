import app from "./app";
import { logger } from "./lib/logger";
import type { Server } from "node:http";

let shuttingDown = false;
let server: Server | undefined;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Process shutdown requested");
  if (!server) {
    process.exitCode = signal === "uncaughtException" || signal === "unhandledRejection" ? 1 : 0;
    return;
  }
  server.close(() => {
    process.exitCode = signal === "uncaughtException" || signal === "unhandledRejection" ? 1 : 0;
  });
  setTimeout(() => process.exit(signal === "uncaughtException" || signal === "unhandledRejection" ? 1 : 0), 10_000).unref();
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  shutdown("uncaughtException");
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
