import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET;
const EXPIRES_IN = "7d";

if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET must be configured in production");
}

const SIGNING_SECRET = SECRET ?? "development-only-secret";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SIGNING_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, SIGNING_SECRET);
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as JwtPayload;
}
