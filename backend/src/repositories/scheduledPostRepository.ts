import { getFirestoreDb, isFirebaseConfigured } from "../firebase/admin.js";
import type { SocialPlatform } from "../types/index.js";

export interface ScheduledPostRecord {
  id: string;
  postId: string;
  workspaceId: string;
  platform: SocialPlatform;
  accountId: string;
  caption: string;
  mediaUrls?: string[];
  scheduledAt: string; // ISO Date String
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export class ScheduledPostRepository {
  private memoryScheduled: Map<string, ScheduledPostRecord> = new Map();

  public async createScheduledItem(item: Partial<ScheduledPostRecord>, workspaceId = "default-workspace"): Promise<ScheduledPostRecord> {
    const id = item.id || `sched_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();

    const record: ScheduledPostRecord = {
      id,
      postId: item.postId || `post_${now}`,
      workspaceId,
      platform: item.platform || "Instagram",
      accountId: item.accountId || "",
      caption: item.caption || "",
      mediaUrls: item.mediaUrls || [],
      scheduledAt: item.scheduledAt || new Date(now + 86400000).toISOString(),
      status: item.status || "pending",
      attempts: item.attempts || 0,
      createdAt: now,
      updatedAt: now,
    };

    this.memoryScheduled.set(id, record);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("scheduledPosts")
          .doc(id)
          .set(record, { merge: true });
      } catch (err) {
        console.warn("[ScheduledPostRepository] Firestore write failed:", err);
      }
    }

    return record;
  }

  public async getPendingJobs(workspaceId = "default-workspace"): Promise<ScheduledPostRecord[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const nowIso = new Date().toISOString();
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("scheduledPosts")
          .where("status", "==", "pending")
          .where("scheduledAt", "<=", nowIso)
          .get();

        const pending: ScheduledPostRecord[] = [];
        snapshot.forEach((doc) => {
          pending.push(doc.data() as ScheduledPostRecord);
        });
        return pending;
      } catch (err) {
        console.warn("[ScheduledPostRepository] Firestore query failed:", err);
      }
    }

    return Array.from(this.memoryScheduled.values()).filter(
      (job) => job.status === "pending" && new Date(job.scheduledAt).getTime() <= Date.now()
    );
  }
}

export const scheduledPostRepository = new ScheduledPostRepository();
