import type { CookieOptions, Request } from "express";
import { ENV } from "./env";

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: ENV.isProduction,
  };
}

export function getRefreshCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: ENV.isProduction,
  };
}
