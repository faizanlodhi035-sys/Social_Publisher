import { Router } from "express";
import { handleMetaVerification, handleMetaEvent } from "../webhooks/metaWebhookHandler.js";
import { handleTikTokEvent } from "../webhooks/tiktokWebhookHandler.js";
import { handleYouTubeVerification, handleYouTubeEvent } from "../webhooks/youtubeWebhookHandler.js";

const router = Router();

// Meta / Facebook / Instagram Webhook
router.get("/webhooks/meta", handleMetaVerification);
router.post("/webhooks/meta", handleMetaEvent);

// TikTok Webhook
router.post("/webhooks/tiktok", handleTikTokEvent);

// YouTube WebSub / Event Webhook
router.get("/webhooks/youtube", handleYouTubeVerification);
router.post("/webhooks/youtube", handleYouTubeEvent);

export default router;
