import { Router } from "express";
import { getJobById, retryJob } from "../controllers/schedulingController.js";

const router = Router();

router.get("/jobs/:jobId", getJobById);
router.post("/jobs/:jobId/retry", retryJob);

export default router;
