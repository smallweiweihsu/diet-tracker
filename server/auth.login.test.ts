import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { isPasswordRequired, verifyPassword } from "./_core/auth";

function makeCtx(): TrpcContext & { cookies: Array<{ name: string; value: string }> } {
  const cookies: Array<{ name: string; value: string }> = [];
  return {
    user: null,
    cookies,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => {
        cookies.push({ name, value });
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

const ORIGINAL_APP_PASSWORD = process.env.APP_PASSWORD;

afterEach(() => {
  if (ORIGINAL_APP_PASSWORD === undefined) delete process.env.APP_PASSWORD;
  else process.env.APP_PASSWORD = ORIGINAL_APP_PASSWORD;
});

describe("auth password gate", () => {
  it("open mode when APP_PASSWORD is unset", () => {
    // ENV snapshots APP_PASSWORD at import time; default test env has none.
    expect(isPasswordRequired()).toBe(false);
  });

  it("rejects empty password input", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.auth.login({ password: "" })).rejects.toThrow();
  });

  it("login succeeds in open mode without setting a cookie", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({ password: "anything" });
    expect(result.success).toBe(true);
    expect(ctx.cookies).toHaveLength(0);
  });

  it("verifyPassword is false for wrong-length and wrong-value inputs", () => {
    expect(verifyPassword("wrong")).toBe(false);
    expect(verifyPassword("")).toBe(false);
  });

  it("config reports passwordRequired", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const config = await caller.auth.config();
    expect(config.passwordRequired).toBe(false);
  });
});
