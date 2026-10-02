import type { Request, Response } from "express";
import crypto from "crypto";
import { envConfig } from "../config/env.js";
import { webhookRepository } from "./webhookRepository.js";
import type { NormalizedSocialEvent } from "./webhookTypes.js";

export const handleMetaVerification = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === envConfig.WEBHOOK_VERIFY_TOKEN) {
    console.log("[MetaWebhook] Challenge verification succeeded.");
    return res.status(200).send(challenge);
  }

  console.warn("[MetaWebhook] Verification failed. Token mismatch.");
  return res.status(403).json({ error: "Verification token mismatch." });
};

export const handleMetaEvent = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;

    if (envConfig.NODE_ENV === "production" && envConfig.meta.appSecret && signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac("sha256", envConfig.meta.appSecret)
        .update(JSON.stringify(req.body))
        .digest("hex")}`;

      if (signature !== expectedSignature) {
        console.warn("[MetaWebhook] Invalid X-Hub-Signature-256 signature.");
        return res.status(401).json({ error: "Invalid payload signature." });
      }
    }

    const body = req.body;
    if (body.object !== "page" && body.object !== "instagram") {
      return res.status(200).json({ status: "ignored", reason: "Unsupported object type" });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const accountId = entry.id || "meta-default";
      const changes = entry.changes || entry.messaging || [];

      for (const change of changes) {
        const value = change.value || {};
        const externalEventId =
          value.comment_id || value.media_id || value.post_id || `${entry.id}_${Date.now()}`;

        // Idempotency check
        const isNew = await webhookRepository.claimEventIdempotent("Meta", externalEventId);
        if (!isNew) {
          console.log(`[MetaWebhook] Event '${externalEventId}' already processed. Skipping.`);
          continue;
        }

        const now = Date.now();
        const normalized: NormalizedSocialEvent = {
          id: `meta_${now}_${Math.random().toString(36).substring(2, 6)}`,
          provider: "Facebook",
          eventType: change.field || "feed_update",
          accountId,
          externalEventId,
          postId: value.post_id,
          receivedAt: now,
          processedAt: now,
          payloadVersion: "v1.0",
          processingStatus: "processed",
          normalizedData: {
            action: change.field || "update",
            mediaId: value.media_id,
            authorName: value.from?.name || value.sender?.id,
            text: value.message || value.comment_text,
            metrics: value.likes ? { likes: value.likes } : undefined,
          },
        };

        await webhookRepository.saveNormalizedEvent(normalized);
        await webhookRepository.updateEventStatus("Meta", externalEventId, "processed");
      }
    }

    return res.status(200).json({ success: true, message: "Meta webhook events processed." });
  } catch (err: any) {
    console.error("[MetaWebhook] Error processing event:", err);
    return res.status(500).json({ error: "Internal error processing Meta webhook event." });
  }
};
