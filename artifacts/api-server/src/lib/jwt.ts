import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
const EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, SECRET);
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as JwtPayload;
}
