import { getFirestoreDb, isFirebaseConfigured } from "../firebase/admin.js";
import type { SocialPlatform } from "../types/index.js";

export interface PostRecord {
  id: string;
  workspaceId: string;
  authorId?: string;
  title: string;
  caption: string;
  platforms: SocialPlatform[];
  status: "Draft" | "Scheduled" | "Published" | "Failed" | "Publishing" | "Cancelled";
  date: string; // YYYY-MM-DD
  time?: string;
  mediaType?: "Image" | "Video";
  mediaUrls?: string[];
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

export class PostRepository {
  private memoryPosts: Map<string, PostRecord> = new Map();

  public async getAllPosts(workspaceId = "default-workspace"): Promise<PostRecord[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("posts")
          .orderBy("createdAt", "desc")
          .get();

        const posts: PostRecord[] = [];
        snapshot.forEach((doc) => {
          posts.push(doc.data() as PostRecord);
        });
        return posts;
      } catch (err) {
        console.warn("[PostRepository] Firestore getAllPosts failed, falling back:", err);
      }
    }

    return Array.from(this.memoryPosts.values())
      .filter((p) => p.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public async getPostById(id: string, workspaceId = "default-workspace"): Promise<PostRecord | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const doc = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("posts")
          .doc(id)
          .get();

        if (doc.exists) {
          return doc.data() as PostRecord;
        }
      } catch (err) {
        console.warn("[PostRepository] Firestore getPostById failed:", err);
      }
    }

    const item = this.memoryPosts.get(id);
    if (item && item.workspaceId === workspaceId) {
      return item;
    }
    return null;
  }

  public async createPost(post: Partial<PostRecord>, workspaceId = "default-workspace"): Promise<PostRecord> {
    const id = post.id || `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();

    // Fetch existing post to avoid overwriting fields with defaults during an update
    const existing = await this.getPostById(id, workspaceId);

    const record: PostRecord = {
      id,
      workspaceId,
      authorId: post.authorId || existing?.authorId || "system_user",
      title: post.title !== undefined ? post.title : (existing?.title || (post.caption ? post.caption.slice(0, 45) : "Untitled Post")),
      caption: post.caption !== undefined ? post.caption : (existing?.caption || ""),
      platforms: post.platforms || existing?.platforms || ["Instagram"],
      status: post.status || existing?.status || "Published",
      date: post.date || existing?.date || new Date().toISOString().split("T")[0],
      time: post.time || existing?.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mediaType: post.mediaType || existing?.mediaType || "Image",
      mediaUrls: post.mediaUrls || existing?.mediaUrls || [],
      thumbnail: post.thumbnail || existing?.thumbnail || "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
      createdAt: existing?.createdAt || post.createdAt || now,
      updatedAt: now,
    };

    this.memoryPosts.set(id, record);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("posts")
          .doc(id)
          .set(record, { merge: true });
      } catch (err) {
        console.warn("[PostRepository] Firestore createPost failed:", err);
      }
    }

    return record;
  }

  public async updatePost(id: string, updates: Partial<PostRecord>, workspaceId = "default-workspace"): Promise<PostRecord> {
    return this.createPost({ ...updates, id }, workspaceId);
  }

  public async deletePost(id: string, workspaceId = "default-workspace"): Promise<boolean> {
    const existing = this.memoryPosts.get(id);
    if (existing && existing.workspaceId !== workspaceId) {
      return false;
    }

    const deleted = this.memoryPosts.delete(id);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("posts")
          .doc(id)
          .delete();
      } catch (err) {
        console.warn("[PostRepository] Firestore deletePost failed:", err);
      }
    }

    return deleted;
  }
}

export const postRepository = new PostRepository();
