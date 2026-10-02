import type { Request, Response } from "express";
import { webhookRepository } from "./webhookRepository.js";
import type { NormalizedSocialEvent } from "./webhookTypes.js";

export const handleTikTokEvent = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const eventType = body.event || body.type || "video_status_update";
    const externalEventId = body.event_id || body.post_id || `tiktok_${Date.now()}`;
    const accountId = body.open_id || "tiktok-default";

    // Idempotency check
    const isNew = await webhookRepository.claimEventIdempotent("TikTok", externalEventId);
    if (!isNew) {
      return res.status(200).json({ status: "already_processed", eventId: externalEventId });
    }

    const now = Date.now();
    const normalized: NormalizedSocialEvent = {
      id: `tiktok_${now}_${Math.random().toString(36).substring(2, 6)}`,
      provider: "TikTok",
      eventType,
      accountId,
      externalEventId,
      postId: body.item_id || body.post_id,
      receivedAt: now,
      processedAt: now,
      payloadVersion: "v1.0",
      processingStatus: "processed",
      normalizedData: {
        action: eventType,
        mediaId: body.item_id,
        text: body.title || body.share_comment,
        metrics: body.statistics
          ? {
              views: body.statistics.play_count || 0,
              likes: body.statistics.digg_count || 0,
              comments: body.statistics.comment_count || 0,
            }
          : undefined,
      },
    };

    await webhookRepository.saveNormalizedEvent(normalized);
    await webhookRepository.updateEventStatus("TikTok", externalEventId, "processed");

    return res.status(200).json({ success: true, message: "TikTok webhook event processed." });
  } catch (err: any) {
    console.error("[TikTokWebhook] Error processing event:", err);
    return res.status(500).json({ error: "Internal error processing TikTok event." });
  }
};
