import express from "express";
import cors from "cors";
import type { Request, Response, NextFunction } from "express";

import { ensureMongoSetup, setMongoStartupError } from "./services/db";
import { requestLogger } from "./middleware/requestLogger";

import authRoutes from "./routes/auth";
import employeesRoutes from "./routes/employees";
import farmersRoutes from "./routes/farmers";
import complaintsRoutes from "./routes/complaints";
import fieldVisitsRoutes from "./routes/fieldVisits";
import mapFeedbackRoutes from "./routes/mapFeedback";
import outreachRoutes from "./routes/outreach";
import uploadRoutes from "./routes/upload";
import s3Routes from "./routes/s3";
import statsRoutes from "./routes/stats";
import adminRoutes from "./routes/admin";
import { handleDemo } from "./routes/demo";

export function createServer() {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(requestLogger);

  // Initialize MongoDB connection on startup
  ensureMongoSetup()
    .then(() => console.log("✅ MongoDB initialized"))
    .catch((err) => {
      console.error("❌ MongoDB startup error:", err);
      setMongoStartupError(err instanceof Error ? err : new Error(String(err)));
    });

  // Mount API routes
  app.get("/api/demo", handleDemo);
  
  app.use("/api/auth", authRoutes);
  app.use("/api/employees", employeesRoutes);
  app.use("/api/farmers", farmersRoutes);
  app.use("/api/complaints", complaintsRoutes);
  app.use("/api/field-visits", fieldVisitsRoutes);
  app.use("/api/map-feedback", mapFeedbackRoutes);
  app.use("/api/outreach", outreachRoutes);
  app.use("/api", uploadRoutes); // /api/data, /api/upload
  app.use("/api/s3", s3Routes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/admin", adminRoutes);

  // 404 handler for API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ message: "API endpoint not found." });
      return;
    }
    next();
  });

  // Global error handler
  app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
    const reqId = (res.locals as any)?.reqId ?? "unknown";
    const errorMessage = String(error?.message ?? "Unexpected server error");
    console.error(`[${reqId}] Unhandled error on ${req.method} ${req.originalUrl}:`, error);

    if (res.headersSent) return;

    if (error?.type === "entity.too.large") {
      res.status(413).json({ message: "Payload too large." });
      return;
    }

    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ message: "Invalid JSON payload." });
      return;
    }

    res.status(Number(error?.statusCode) || 500).json({ message: errorMessage });
  });

  return app;
} 