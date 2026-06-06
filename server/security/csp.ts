import type { Request, Response, NextFunction } from "express";
import { ENV } from "../_core/env";

const SELF = "'self'";

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  if (ENV.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  const scriptSrc = ENV.isProduction ? SELF : `${SELF} 'unsafe-inline'`;
  const connectSrc = ENV.isProduction ? SELF : `${SELF} ws:`;

  const csp = [
    `default-src ${SELF}`,
    `script-src ${scriptSrc}`,
    `style-src ${SELF} 'unsafe-inline'`,
    `img-src ${SELF} data: blob:`,
    `connect-src ${connectSrc}`,
    `font-src ${SELF}`,
    `form-action ${SELF}`,
    `frame-ancestors ${SELF}`,
    `base-uri ${SELF}`,
  ];

  res.setHeader("Content-Security-Policy", csp.join("; "));
  next();
}
