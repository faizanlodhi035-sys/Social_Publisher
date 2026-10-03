import { getFirestoreDb, isFirebaseConfigured } from "../firebase/admin.js";
import type { JobStatus, PublishingJob } from "./types.js";

export class JobRepository {
  private memoryJobs: Map<string, PublishingJob> = new Map();

  public async createJob(jobData: Partial<PublishingJob> & { workspaceId: string; postId: string; platform: PublishingJob["platform"] }, workspaceId = "default-workspace"): Promise<PublishingJob> {
    const id = jobData.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();

    const record: PublishingJob = {
      id,
      workspaceId: jobData.workspaceId || workspaceId,
      userId: jobData.userId || "system_user",
      postId: jobData.postId,
      accountId: jobData.accountId || `${jobData.platform.toLowerCase()}-default`,
      platform: jobData.platform,
      caption: jobData.caption || "",
      mediaUrls: jobData.mediaUrls || [],
      status: jobData.status || "queued",
      scheduledAt: jobData.scheduledAt || new Date(now).toISOString(),
      attempts: jobData.attempts || 0,
      maxAttempts: jobData.maxAttempts || 3,
      idempotencyKey: jobData.idempotencyKey || `${jobData.workspaceId || workspaceId}_${jobData.postId}_${jobData.platform}`,
      createdAt: jobData.createdAt || now,
      updatedAt: now,
    };

    this.memoryJobs.set(id, record);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("publishingJobs")
          .doc(id)
          .set(record, { merge: true });
      } catch (err) {
        console.warn("[JobRepository] Firestore createJob failed:", err);
      }
    }

    return record;
  }

  public async getJobById(jobId: string, workspaceId = "default-workspace"): Promise<PublishingJob | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const doc = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("publishingJobs")
          .doc(jobId)
          .get();

        if (doc.exists) {
          return doc.data() as PublishingJob;
        }
      } catch (err) {
        console.warn("[JobRepository] Firestore getJobById failed:", err);
      }
    }

    return this.memoryJobs.get(jobId) || null;
  }

  public async getJobByIdempotencyKey(key: string, workspaceId = "default-workspace"): Promise<PublishingJob | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("publishingJobs")
          .where("idempotencyKey", "==", key)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          return snapshot.docs[0].data() as PublishingJob;
        }
      } catch (err) {
        console.warn("[JobRepository] Firestore getJobByIdempotencyKey failed:", err);
      }
    }

    for (const job of this.memoryJobs.values()) {
      if (job.idempotencyKey === key) return job;
    }
    return null;
  }

  public async getJobsByPostId(postId: string, workspaceId = "default-workspace"): Promise<PublishingJob[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("publishingJobs")
          .where("postId", "==", postId)
          .get();

        const jobs: PublishingJob[] = [];
        snapshot.forEach((doc) => {
          jobs.push(doc.data() as PublishingJob);
        });
        return jobs;
      } catch (err) {
        console.warn("[JobRepository] Firestore getJobsByPostId failed:", err);
      }
    }

    return Array.from(this.memoryJobs.values()).filter((j) => j.postId === postId && j.workspaceId === workspaceId);
  }

  public async listWorkspaceJobs(workspaceId = "default-workspace", statusFilter?: JobStatus): Promise<PublishingJob[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        let query: any = db.collection("workspaces").doc(workspaceId).collection("publishingJobs");
        if (statusFilter) {
          query = query.where("status", "==", statusFilter);
        }
        const snapshot = await query.get();
        const jobs: PublishingJob[] = [];
        snapshot.forEach((doc: any) => {
          jobs.push(doc.data() as PublishingJob);
        });
        return jobs;
      } catch (err) {
        console.warn("[JobRepository] Firestore listWorkspaceJobs failed:", err);
      }
    }

    return Array.from(this.memoryJobs.values()).filter(
      (j) => j.workspaceId === workspaceId && (statusFilter ? j.status === statusFilter : true)
    );
  }

  /**
   * Atomically claims job for processing (prevents concurrent worker duplicate publishes).
   */
  public async claimJob(jobId: string, workspaceId = "default-workspace"): Promise<PublishingJob | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const ref = db.collection("workspaces").doc(workspaceId).collection("publishingJobs").doc(jobId);
        return await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(ref);
          if (!doc.exists) return null;

          const job = doc.data() as PublishingJob;
          if (job.status === "processing" || job.status === "published" || job.status === "cancelled") {
            return null; // Job already claimed, published or cancelled
          }

          const updated: PublishingJob = {
            ...job,
            status: "processing",
            startedAt: new Date().toISOString(),
            lockedAt: Date.now(),
            updatedAt: Date.now(),
          };

          transaction.set(ref, updated, { merge: true });
          return updated;
        });
      } catch (err) {
        console.warn("[JobRepository] Firestore claimJob transaction failed:", err);
      }
    }

    const job = this.memoryJobs.get(jobId);
    if (!job || job.status === "processing" || job.status === "published" || job.status === "cancelled") {
      return null;
    }

    const updated: PublishingJob = {
      ...job,
      status: "processing",
      startedAt: new Date().toISOString(),
      lockedAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.memoryJobs.set(jobId, updated);
    return updated;
  }

  public async updateJob(jobId: string, updates: Partial<PublishingJob>, workspaceId = "default-workspace"): Promise<PublishingJob | null> {
    const existing = this.memoryJobs.get(jobId);
    if (existing) {
      const next = { ...existing, ...updates, updatedAt: Date.now() };
      this.memoryJobs.set(jobId, next);
    }

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("publishingJobs")
          .doc(jobId)
          .update({ ...updates, updatedAt: Date.now() });
      } catch (err) {
        console.warn("[JobRepository] Firestore updateJob failed:", err);
      }
    }

    return this.getJobById(jobId, workspaceId);
  }
  public async deleteJob(jobId: string, workspaceId = "default-workspace"): Promise<void> {
    this.memoryJobs.delete(jobId);
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db.collection("workspaces").doc(workspaceId).collection("publishingJobs").doc(jobId).delete();
      } catch (err) {
        console.warn("[JobRepository] Firestore deleteJob failed:", err);
      }
    }
  }
}

export const jobRepository = new JobRepository();
