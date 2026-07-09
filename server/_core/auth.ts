import { timingSafeEqual } from "node:crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// Standalone single-user auth: one local account, optionally gated by
// APP_PASSWORD. Sessions are HS256 JWTs stored in an httpOnly cookie.

export const LOCAL_OPEN_ID = "local-user";

function getSessionSecret(): Uint8Array {
  if (ENV.cookieSecret) return new TextEncoder().encode(ENV.cookieSecret);
  if (ENV.isProduction) {
    throw new Error("JWT_SECRET is required in production");
  }
  return new TextEncoder().encode("diet-tracker-dev-secret");
}

export function isPasswordRequired(): boolean {
  return ENV.appPassword.length > 0;
}

export function verifyPassword(input: string): boolean {
  // Never accept a password when none is configured.
  if (!isPasswordRequired()) return false;
  const expected = Buffer.from(ENV.appPassword);
  const actual = Buffer.from(input);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function signSessionToken(): Promise<string> {
  const expirationSeconds = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId: LOCAL_OPEN_ID })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    return payload.openId === LOCAL_OPEN_ID;
  } catch {
    return false;
  }
}

export async function ensureLocalUser(): Promise<User | null> {
  const existing = await db.getUserByOpenId(LOCAL_OPEN_ID);
  if (existing) return existing;
  await db.upsertUser({
    openId: LOCAL_OPEN_ID,
    name: "我的帳號",
    role: "admin",
    lastSignedIn: new Date(),
  });
  return (await db.getUserByOpenId(LOCAL_OPEN_ID)) ?? null;
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  // Open mode: no password configured, everyone is the local user.
  if (!isPasswordRequired()) return ensureLocalUser();

  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const valid = await verifySessionToken(cookies[COOKIE_NAME]);
  return valid ? ensureLocalUser() : null;
}
