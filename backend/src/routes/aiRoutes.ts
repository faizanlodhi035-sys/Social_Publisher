import { Router } from "express";
import {
  generateCaption,
  rewriteCaption,
  generateIdeas,
  generateHashtags,
  adaptContent,
  generateHooks,
  getAIStatus,
} from "../controllers/aiController.js";

const router = Router();

router.get("/status", getAIStatus);
router.post("/caption", generateCaption);
router.post("/rewrite", rewriteCaption);
router.post("/ideas", generateIdeas);
router.post("/hashtags", generateHashtags);
router.post("/adapt", adaptContent);
router.post("/hooks", generateHooks);

export default router;
