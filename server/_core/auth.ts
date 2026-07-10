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

// The active profile is carried in the session JWT's `openId`. A single device
// (optionally gated by APP_PASSWORD) can hold several profiles and switch
// between them; each profile is its own row in `users` with isolated data.
export async function signSessionToken(openId: string = LOCAL_OPEN_ID): Promise<string> {
  const expirationSeconds = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

// Returns the openId stored in a valid token, or null if missing/invalid.
async function readSessionOpenId(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    return typeof payload.openId === "string" ? payload.openId : null;
  } catch {
    return null;
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
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const openId = await readSessionOpenId(cookies[COOKIE_NAME]);

  // With a password gate, a valid session cookie is required to enter.
  if (isPasswordRequired() && !openId) return null;

  // Resolve the active profile from the cookie; fall back to the default local
  // profile (open mode with no cookie yet, or a profile that no longer exists).
  if (openId && openId !== LOCAL_OPEN_ID) {
    const profile = await db.getUserByOpenId(openId);
    if (profile) return profile;
  }
  return ensureLocalUser();
}
