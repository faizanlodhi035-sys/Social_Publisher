import { getFirestoreDb, isFirebaseConfigured } from "../firebase/admin.js";
import type { NormalizedSocialEvent, WebhookEventRecord, ProcessingStatus } from "./webhookTypes.js";

export class WebhookRepository {
  private processedEventsMemory: Set<string> = new Set();
  private socialEventsMemory: Map<string, NormalizedSocialEvent> = new Map();

  /**
   * Atomic check and claim for webhook event idempotency.
   * Returns true if event is NEW and successfully claimed.
   * Returns false if event was ALREADY processed/received.
   */
  public async claimEventIdempotent(
    provider: string,
    externalEventId: string,
    workspaceId = "default-workspace"
  ): Promise<boolean> {
    const key = `${provider.toLowerCase()}_${externalEventId}`;

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const docRef = db.collection("webhookEvents").doc(key);
        return await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (doc.exists) {
            return false; // Already received/processed
          }
          const record: WebhookEventRecord = {
            id: key,
            provider: provider as any,
            externalEventId,
            status: "processing",
            createdAt: Date.now(),
          };
          transaction.set(docRef, record);
          return true;
        });
      } catch (err) {
        console.warn("[WebhookRepository] Firestore transaction fallback:", err);
      }
    }

    if (this.processedEventsMemory.has(key)) {
      return false;
    }
    this.processedEventsMemory.add(key);
    return true;
  }

  public async updateEventStatus(
    provider: string,
    externalEventId: string,
    status: ProcessingStatus,
    error?: string
  ): Promise<void> {
    const key = `${provider.toLowerCase()}_${externalEventId}`;
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("webhookEvents")
          .doc(key)
          .set(
            {
              status,
              processedAt: Date.now(),
              ...(error ? { error } : {}),
            },
            { merge: true }
          );
      } catch (err) {
        console.warn("[WebhookRepository] Update event status failed:", err);
      }
    }
  }

  public async saveNormalizedEvent(
    event: NormalizedSocialEvent,
    workspaceId = "default-workspace"
  ): Promise<NormalizedSocialEvent> {
    this.socialEventsMemory.set(event.id, event);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("socialEvents")
          .doc(event.id)
          .set(event, { merge: true });
      } catch (err) {
        console.warn("[WebhookRepository] saveNormalizedEvent failed:", err);
      }
    }

    return event;
  }

  public async getRecentEvents(
    workspaceId = "default-workspace",
    limit = 50
  ): Promise<NormalizedSocialEvent[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("socialEvents")
          .orderBy("receivedAt", "desc")
          .limit(limit)
          .get();

        const results: NormalizedSocialEvent[] = [];
        snapshot.forEach((doc) => results.push(doc.data() as NormalizedSocialEvent));
        return results;
      } catch (err) {
        console.warn("[WebhookRepository] getRecentEvents failed:", err);
      }
    }

    return Array.from(this.socialEventsMemory.values())
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, limit);
  }
}

export const webhookRepository = new WebhookRepository();
