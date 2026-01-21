import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMapIndiaTop10, getMapInfo } from "../controllers/map.controller.js";

const r = Router();

r.get("/map/india-top10/:tmxId", asyncHandler(getMapIndiaTop10));
r.get("/map/info/:tmxId", asyncHandler(getMapInfo));

export default r;
