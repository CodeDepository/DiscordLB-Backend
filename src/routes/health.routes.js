import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { healthOk, healthLive, healthCore } from "../controllers/health.controller.js";

const r = Router();

r.get("/health", healthOk);
r.get("/health/live", asyncHandler(healthLive));
r.get("/health/core", asyncHandler(healthCore));

export default r;
