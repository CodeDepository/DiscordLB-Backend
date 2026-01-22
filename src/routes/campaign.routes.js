import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { refreshIndiaTop10, getCachedIndiaTop10 } from "../controllers/campaign.controller.js";

const r = Router();

r.get("/refresh/india-top10", asyncHandler(refreshIndiaTop10));
r.get("/india-top10", asyncHandler(getCachedIndiaTop10));

export default r;
