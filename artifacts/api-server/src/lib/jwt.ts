import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

const SECRET = process.env.SESSION_SECRET;
export const TOKEN_ISSUER = "enterprise-college-erp";
export const TOKEN_AUDIENCE = "enterprise-college-erp-web";
export const TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 15 * 60);
export const REMEMBER_ME_REFRESH_TTL_SECONDS = Number(process.env.REMEMBER_ME_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60);
export const SESSION_REFRESH_TTL_SECONDS = Number(process.env.SESSION_REFRESH_TTL_SECONDS ?? 24 * 60 * 60);

if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET must be configured in production");
}

const SIGNING_SECRET = SECRET ?? "development-only-secret";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  jti: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export function signToken(
  payload: Omit<JwtPayload, "jti" | "iat" | "exp" | "iss" | "aud">,
  tokenId = randomUUID(),
): string {
  return jwt.sign({ ...payload, jti: tokenId }, SIGNING_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    algorithm: "HS256",
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, SIGNING_SECRET, {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    algorithms: ["HS256"],
  });
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  if (
    typeof decoded.userId !== "number" ||
    typeof decoded.email !== "string" ||
    typeof decoded.role !== "string" ||
    typeof decoded.jti !== "string" ||
    !decoded.exp ||
    decoded.exp <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error("Invalid token claims");
  }
  return decoded as JwtPayload;
}
