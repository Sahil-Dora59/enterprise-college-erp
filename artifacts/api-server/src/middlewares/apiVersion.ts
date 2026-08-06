import type { RequestHandler } from "express";

/**
 * Version metadata is additive. Existing /api routes remain unchanged while
 * future routers can opt into an explicit /api/v1 mount.
 */
export const apiVersion = (version: string): RequestHandler => (_req, res, next) => {
  res.setHeader("X-API-Version", version);
  next();
};