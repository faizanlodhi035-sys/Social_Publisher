import { getFirestoreDb } from "../firebase/admin.js";

export interface AdminAuditRecord {
  id: string;
  actorAdminId: string;
  actorAdminEmail: string;
  targetUserId?: string;
  targetWorkspaceId?: string;
  action: string;
  details: Record<string, any>;
  result: "SUCCESS" | "FAILED";
  timestamp: string;
}

const localAuditLogs: AdminAuditRecord[] = [];

export class AdminAuditService {
  /**
   * Writes a sensitive admin action record to Firestore adminAuditLogs collection.
   */
  public async logAction(params: {
    actorAdminId: string;
    actorAdminEmail: string;
    targetUserId?: string;
    targetWorkspaceId?: string;
    action: string;
    details: Record<string, any>;
    result?: "SUCCESS" | "FAILED";
  }): Promise<AdminAuditRecord> {
    const now = new Date().toISOString();
    const logId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const logRecord: AdminAuditRecord = {
      id: logId,
      actorAdminId: params.actorAdminId,
      actorAdminEmail: params.actorAdminEmail,
      targetUserId: params.targetUserId,
      targetWorkspaceId: params.targetWorkspaceId,
      action: params.action,
      details: params.details,
      result: params.result || "SUCCESS",
      timestamp: now,
    };

    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection("adminAuditLogs").doc(logId).set(logRecord);
      } catch (err) {
        console.warn("[AdminAuditService] Firestore log error, fallback:", err);
      }
    }

    localAuditLogs.unshift(logRecord);
    if (localAuditLogs.length > 500) {
      localAuditLogs.pop();
    }

    return logRecord;
  }

  /**
   * Retrieves audit records for SaaS Admin view.
   */
  public async getAuditLogs(limit = 100): Promise<AdminAuditRecord[]> {
    const db = getFirestoreDb();
    if (db) {
      try {
        const snapshot = await db.collection("adminAuditLogs").orderBy("timestamp", "desc").limit(limit).get();
        if (!snapshot.empty) {
          return snapshot.docs.map((doc) => doc.data() as AdminAuditRecord);
        }
      } catch {
        // fallback
      }
    }
    return localAuditLogs.slice(0, limit);
  }
}

export const adminAuditService = new AdminAuditService();
