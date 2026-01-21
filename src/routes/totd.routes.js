import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getTotdIndiaTop10 } from "../controllers/totd.controller.js";

const r = Router();

r.get("/totd/india-top10", asyncHandler(getTotdIndiaTop10));

export default r;
