import express from "express";

import healthRoutes from "./routes/health.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import totdRoutes from "./routes/totd.routes.js";
import mapRoutes from "./routes/map.routes.js";

export function buildApp() {
  const app = express();
  app.use(express.json());

  // mount routes
  app.use("/", healthRoutes);
  app.use("/", campaignRoutes);
  app.use("/", totdRoutes);
  app.use("/", mapRoutes);

  // error handler (last)
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || String(err) });
  });

  return app;
}
