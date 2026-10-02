import type { Request, Response } from "express";
import { webhookRepository } from "./webhookRepository.js";
import type { NormalizedSocialEvent } from "./webhookTypes.js";

export const handleYouTubeVerification = (req: Request, res: Response) => {
  const challenge = req.query["hub.challenge"] as string;
  if (challenge) {
    console.log("[YouTubeWebhook] WebSub challenge verified.");
    return res.status(200).send(challenge);
  }
  return res.status(400).json({ error: "Missing hub.challenge parameter." });
};

export const handleYouTubeEvent = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const externalEventId = body.video_id || body.entry?.["yt:videoId"]?.[0] || `yt_${Date.now()}`;
    const accountId = body.channel_id || body.entry?.["yt:channelId"]?.[0] || "youtube-default";

    // Idempotency check
    const isNew = await webhookRepository.claimEventIdempotent("YouTube", externalEventId);
    if (!isNew) {
      return res.status(200).json({ status: "already_processed", eventId: externalEventId });
    }

    const now = Date.now();
    const normalized: NormalizedSocialEvent = {
      id: `youtube_${now}_${Math.random().toString(36).substring(2, 6)}`,
      provider: "YouTube",
      eventType: "video_published",
      accountId,
      externalEventId,
      postId: externalEventId,
      receivedAt: now,
      processedAt: now,
      payloadVersion: "v1.0",
      processingStatus: "processed",
      normalizedData: {
        action: "video_upload",
        mediaId: externalEventId,
        text: body.title || body.entry?.title?.[0],
        metrics: body.metrics
          ? {
              views: body.metrics.viewCount || 0,
              likes: body.metrics.likeCount || 0,
            }
          : undefined,
      },
    };

    await webhookRepository.saveNormalizedEvent(normalized);
    await webhookRepository.updateEventStatus("YouTube", externalEventId, "processed");

    return res.status(200).json({ success: true, message: "YouTube event processed." });
  } catch (err: any) {
    console.error("[YouTubeWebhook] Error processing event:", err);
    return res.status(500).json({ error: "Internal error processing YouTube event." });
  }
};
