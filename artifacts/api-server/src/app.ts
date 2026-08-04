import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { startDeliveryWorker } from "./workers/deliveryWorker";

const app: Express = express();
// The app runs behind Replit's reverse proxy; trust its single forwarded hop
// so rate limiting and request IP logging use the real client address safely.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"]?.toString() || randomUUID(),
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
    customProps: (req) => ({ requestId: req.id }),
  }),
);
app.use(helmet());
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: allowedOrigin ? allowedOrigin.split(",").map((origin) => origin.trim()) : false,
  credentials: Boolean(allowedOrigin),
}));
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));
app.disable("x-powered-by");

const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later." },
  handler: (req, res, _next, options) => {
    logger.warn(
      { requestId: req.id, ip: req.ip, path: req.path },
      "Authentication rate limit exceeded",
    );
    res.status(options.statusCode).json(options.message);
  },
});

app.use("/api/auth/login", authRateLimit);
app.use("/api/auth/change-password", authRateLimit);
app.use("/api", apiRateLimit);
app.use("/api", router);

// The ERP artifact uses this API server as its single full-stack preview.
// Keep the API mounted first, then serve the built SPA for browser routes.
// The standalone API artifact continues to work when the frontend build is absent.
const frontendPublicCandidates = [
  path.resolve(process.cwd(), "artifacts", "college-erp", "dist", "public"),
  path.resolve(process.cwd(), "..", "college-erp", "dist", "public"),
  path.resolve(__dirname, "..", "..", "college-erp", "dist", "public"),
];
const frontendPublicDir = frontendPublicCandidates.find((candidate) =>
  existsSync(candidate),
);

if (frontendPublicDir) {
  app.use(express.static(frontendPublicDir));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(frontendPublicDir, "index.html"));
  });
}

app.use("/api", notFoundHandler);
app.use(errorHandler);

// Start provider-neutral admission delivery worker (30 s polling interval)
startDeliveryWorker(30_000);

export default app;
