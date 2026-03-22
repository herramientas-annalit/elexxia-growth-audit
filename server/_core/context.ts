import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function authenticateRequest(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const rawCookies = req.headers.cookie ?? "";
    const cookies = parseCookieHeader(rawCookies);
    const sessionCookie = cookies[COOKIE_NAME];
    if (!sessionCookie) return null;

    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(sessionCookie, secret, { algorithms: ["HS256"] });

    // Admin shortcut: skip DB lookup entirely
    if (payload.role === 'admin') {
      return {
        id: 0,
        openId: String(payload.openId ?? 'admin'),
        name: String(payload.name ?? 'Admin'),
        email: String(payload.email ?? ENV.adminEmail),
        role: 'admin' as const,
        loginMethod: 'password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
    }

    const openId = payload.openId as string | undefined;
    if (!openId) return null;

    let user = await db.getUserByOpenId(openId);
    if (!user) {
      await db.upsertUser({
        openId,
        name: "Admin",
        email: null,
        loginMethod: "password",
        lastSignedIn: new Date(),
      });
      user = await db.getUserByOpenId(openId);
    } else {
      await db.upsertUser({ openId, lastSignedIn: new Date() });
    }
    return user ?? null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const user = await authenticateRequest(opts.req);
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
