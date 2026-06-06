import type { Request, Response, NextFunction } from "express";
import { ENV } from "../_core/env";

type WindowEntry = {
  count: number;
  resetAt: number;
};

const windows = new Map<string, WindowEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key);
  }
}, 300_000);

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
};

const defaults: RateLimitOptions = {
  windowMs: 60_000,
  max: 60,
  message: "Too many requests, please try again later",
};

export function rateLimit(opts?: Partial<RateLimitOptions>) {
  const { windowMs, max, message } = { ...defaults, ...opts };

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting in development
    if (!ENV.isProduction) return next();

    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let entry = windows.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      windows.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}
