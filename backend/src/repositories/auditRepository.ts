import { getFirestoreDb, isFirebaseConfigured } from "../firebase/admin.js";
import type { SocialPlatform } from "../types/index.js";

export type AuditEventType =
  | "scheduled"
  | "queued"
  | "processing"
  | "published"
  | "retrying"
  | "failed"
  | "cancelled"
  | "rescheduled";

export interface AuditEventRecord {
  id: string;
  workspaceId: string;
  postId: string;
  jobId?: string;
  accountId?: string;
  platform?: SocialPlatform;
  eventType: AuditEventType;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export class AuditRepository {
  private memoryEvents: AuditEventRecord[] = [];

  public async logEvent(
    event: Partial<AuditEventRecord> & { workspaceId: string; postId: string; eventType: AuditEventType; message: string }
  ): Promise<AuditEventRecord> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const record: AuditEventRecord = {
      id,
      workspaceId: event.workspaceId,
      postId: event.postId,
      jobId: event.jobId,
      accountId: event.accountId,
      platform: event.platform,
      eventType: event.eventType,
      message: event.message,
      details: event.details,
      timestamp: new Date().toISOString(),
    };

    this.memoryEvents.push(record);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(event.workspaceId)
          .collection("auditEvents")
          .doc(id)
          .set(record);
      } catch (err) {
        console.warn("[AuditRepository] Firestore logEvent failed:", err);
      }
    }

    return record;
  }

  public async getPostAuditEvents(postId: string, workspaceId = "default-workspace"): Promise<AuditEventRecord[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("auditEvents")
          .where("postId", "==", postId)
          .orderBy("timestamp", "desc")
          .get();

        const events: AuditEventRecord[] = [];
        snapshot.forEach((doc) => {
          events.push(doc.data() as AuditEventRecord);
        });
        return events;
      } catch (err) {
        console.warn("[AuditRepository] Firestore query failed:", err);
      }
    }

    return this.memoryEvents
      .filter((e) => e.workspaceId === workspaceId && e.postId === postId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const auditRepository = new AuditRepository();
