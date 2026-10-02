import { getFirestoreDb, isFirebaseConfigured } from "../firebase/admin.js";

export interface WorkspaceRecord {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberRecord {
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName?: string;
  primaryWorkspaceId: string;
  saasRole?: "user" | "saas_admin";
  status?: "active" | "suspended";
  userPlan?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback for local development without live GCP credentials
const localWorkspaces = new Map<string, WorkspaceRecord>();
const localMembers = new Map<string, WorkspaceMemberRecord[]>();
const localUsers = new Map<string, UserProfileRecord>();

export class WorkspaceService {
  /**
   * Generates a deterministic workspace ID from a user ID.
   */
  public getPersonalWorkspaceId(userId: string): string {
    const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    return `ws_${sanitized}`;
  }

  /**
   * Idempotently creates or retrieves a user's personal workspace.
   */
  public async getOrCreateUserWorkspace(userId: string, email: string, displayName?: string): Promise<{ workspace: WorkspaceRecord; user: UserProfileRecord }> {
    const workspaceId = this.getPersonalWorkspaceId(userId);
    const now = new Date().toISOString();

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        const wsRef = db.collection("workspaces").doc(workspaceId);
        const wsDoc = await wsRef.get();

        let workspace: WorkspaceRecord;
        if (!wsDoc.exists) {
          workspace = {
            id: workspaceId,
            name: displayName ? `${displayName}'s Workspace` : "Personal Workspace",
            ownerId: userId,
            createdAt: now,
            updatedAt: now,
          };
          await wsRef.set(workspace);

          // Add owner membership record
          await wsRef.collection("members").doc(userId).set({
            userId,
            role: "owner",
            joinedAt: now,
          });
        } else {
          workspace = wsDoc.data() as WorkspaceRecord;
        }

        let userProfile: UserProfileRecord;
        if (!userDoc.exists) {
          userProfile = {
            uid: userId,
            email,
            displayName: displayName || email.split("@")[0],
            primaryWorkspaceId: workspaceId,
            saasRole: "user",
            status: "active",
            userPlan: "free",
            lastActivityAt: now,
            createdAt: now,
            updatedAt: now,
          };
          await userRef.set(userProfile);
        } else {
          userProfile = userDoc.data() as UserProfileRecord;
          // Ensure default values if missing
          if (!userProfile.saasRole) userProfile.saasRole = "user";
          if (!userProfile.status) userProfile.status = "active";
          if (!userProfile.userPlan) userProfile.userPlan = "free";
          
          // Update lastActivityAt periodically
          await userRef.update({ lastActivityAt: now, updatedAt: now }).catch(() => {});
          userProfile.lastActivityAt = now;
        }

        return { workspace, user: userProfile };
      } catch (err) {
        console.warn("[WorkspaceService] Firestore error, using local fallback:", err instanceof Error ? err.message : err);
      }
    }

    // Local in-memory fallback
    let workspace = localWorkspaces.get(workspaceId);
    if (!workspace) {
      workspace = {
        id: workspaceId,
        name: displayName ? `${displayName}'s Workspace` : "Personal Workspace",
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      };
      localWorkspaces.set(workspaceId, workspace);
      localMembers.set(workspaceId, [{ userId, role: "owner", joinedAt: now }]);
    }

    let userProfile = localUsers.get(userId);
    if (!userProfile) {
      userProfile = {
        uid: userId,
        email,
        displayName: displayName || email.split("@")[0],
        primaryWorkspaceId: workspaceId,
        saasRole: "user",
        status: "active",
        userPlan: "free",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      };
      localUsers.set(userId, userProfile);
    } else {
      userProfile.lastActivityAt = now;
    }

    return { workspace, user: userProfile };
  }

  /**
   * Retrieves a single user profile by userId.
   */
  public async getUserProfile(userId: string): Promise<UserProfileRecord | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const data = userDoc.data() as UserProfileRecord;
          return {
            ...data,
            saasRole: data.saasRole || "user",
            status: data.status || "active",
            userPlan: data.userPlan || "free",
          };
        }
      } catch {
        // Fall back to local
      }
    }
    return localUsers.get(userId) || null;
  }

  /**
   * Retrieves all registered user profiles for SaaS Admin panel.
   */
  public async getAllUserProfiles(): Promise<UserProfileRecord[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db.collection("users").get();
        return snapshot.docs.map((doc) => {
          const data = doc.data() as UserProfileRecord;
          return {
            ...data,
            saasRole: data.saasRole || "user",
            status: data.status || "active",
            userPlan: data.userPlan || "free",
          };
        });
      } catch {
        // Fall back to local
      }
    }
    return Array.from(localUsers.values());
  }

  /**
   * Updates user profile fields (e.g. status, saasRole, userPlan).
   */
  public async updateUserProfile(userId: string, updates: Partial<UserProfileRecord>): Promise<UserProfileRecord> {
    const now = new Date().toISOString();
    const updatePayload = { ...updates, updatedAt: now };

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const userRef = db.collection("users").doc(userId);
        await userRef.set(updatePayload, { merge: true });
        const updatedDoc = await userRef.get();
        return updatedDoc.data() as UserProfileRecord;
      } catch (err) {
        console.warn("[WorkspaceService] Firestore update user error, using local fallback:", err);
      }
    }

    const existing = localUsers.get(userId);
    if (!existing) {
      throw new Error(`User ${userId} not found`);
    }
    const updated = { ...existing, ...updatePayload };
    localUsers.set(userId, updated);
    return updated;
  }

  /**
   * Verifies if a user is an authorized member of a workspace.
   */
  public async isUserMemberOfWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    // Owner shortcut for personal workspace
    if (workspaceId === this.getPersonalWorkspaceId(userId) || workspaceId === `ws_${userId}`) {
      return true;
    }

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const memberDoc = await db.collection("workspaces").doc(workspaceId).collection("members").doc(userId).get();
        if (memberDoc.exists) return true;

        const wsDoc = await db.collection("workspaces").doc(workspaceId).get();
        if (wsDoc.exists && wsDoc.data()?.ownerId === userId) return true;
      } catch {
        // Fallback to local check
      }
    }

    const members = localMembers.get(workspaceId) || [];
    return members.some((m) => m.userId === userId) || localWorkspaces.get(workspaceId)?.ownerId === userId;
  }
}

export const workspaceService = new WorkspaceService();
