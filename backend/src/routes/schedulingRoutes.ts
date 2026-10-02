import { Router } from "express";
import {
  schedulePost,
  publishPostNow,
  reschedulePost,
  cancelScheduledPost,
  getScheduledPosts,
} from "../controllers/schedulingController.js";

const router = Router();

router.post("/posts/schedule", schedulePost);
router.post("/posts/:postId/publish", publishPostNow);
router.put("/posts/:postId/reschedule", reschedulePost);
router.delete("/posts/:postId/cancel", cancelScheduledPost);
router.get("/scheduled-posts", getScheduledPosts);

export default router;
