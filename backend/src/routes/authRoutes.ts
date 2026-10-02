import { Router } from "express";
import { getAuthStatus, initiateOAuth } from "../controllers/authController.js";

const router = Router();

router.get("/status", getAuthStatus);
router.get("/:platform", initiateOAuth);

export default router;
