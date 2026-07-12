import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const reqId = randomUUID().slice(0, 8);
  (res.locals as any).reqId = reqId;
  console.info(`[${reqId}] -> ${req.method} ${req.originalUrl} from ${req.ip || "unknown"}`);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.info(`[${reqId}] <- ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`);
  });

  next();
}
