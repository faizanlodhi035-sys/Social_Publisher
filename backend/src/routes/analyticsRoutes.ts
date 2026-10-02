import { Router } from "express";
import {
  getAnalyticsOverview,
  getAnalyticsPosts,
  getAnalyticsPlatforms,
} from "../controllers/analyticsController.js";

const router = Router();

router.get("/analytics/overview", getAnalyticsOverview);
router.get("/analytics/posts", getAnalyticsPosts);
router.get("/analytics/platforms", getAnalyticsPlatforms);

export default router;
