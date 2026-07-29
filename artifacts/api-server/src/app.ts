import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
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
  }),
);
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: allowedOrigin ? allowedOrigin.split(",").map((origin) => origin.trim()) : false,
  credentials: Boolean(allowedOrigin),
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

export default app;
