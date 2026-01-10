import express from "express";
import { compareHandler } from "../controller/compare.controller.js";

const router = express.Router();
router.post("/compare", compareHandler);

export const compareRoutes = router;
