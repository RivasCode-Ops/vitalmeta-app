import type { Request, Response, NextFunction } from "express";
import { ENV } from "../_core/env";

const DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const PROD_ORIGINS = ENV.oAuthServerUrl
  ? [new URL(ENV.oAuthServerUrl).origin]
  : [];

export const ALLOWED_ORIGINS = ENV.isProduction ? PROD_ORIGINS : DEV_ORIGINS;

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
