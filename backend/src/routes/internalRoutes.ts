import { Router } from "express";
import { processInternalJob } from "../controllers/schedulingController.js";

const router = Router();

// Internal worker endpoint for Cloud Tasks / background worker execution
router.post("/internal/publishing-jobs/:jobId/process", processInternalJob);

export default router;
