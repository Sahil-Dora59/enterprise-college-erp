import express, { type IRouter } from "express";
import { createServer, type Server } from "node:http";

export function configureTestEnvironment(): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    "postgresql://test:test@127.0.0.1:1/erp_test";
  process.env.SESSION_SECRET = "task-2-local-test-secret";
}

export async function startRouterServer(router: IRouter): Promise<{
  request: (path: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
}> {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(router);
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("Test server did not expose a TCP address");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    request: (path, init) => fetch(`${baseUrl}${path}`, init),
    close: () => closeServer(server),
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}