export interface AppConfig {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  LOG_LEVEL: string;
  CORS_ORIGIN?: string;
  DATABASE_URL?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (nodeEnv !== "development" && nodeEnv !== "test" && nodeEnv !== "production") {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
  }

  const port = Number(env.PORT ?? 8080);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    LOG_LEVEL: env.LOG_LEVEL ?? "info",
    CORS_ORIGIN: env.CORS_ORIGIN,
    DATABASE_URL: env.DATABASE_URL,
  };
}

export const config = loadConfig();