import { getFirestoreDb, getStorageBucket, isFirebaseConfigured } from "../firebase/admin.js";

export interface MediaAssetRecord {
  id: string;
  workspaceId: string;
  ownerId?: string;
  name: string;
  type: "image" | "video";
  mimeType: string;
  size: number;
  url: string;
  storagePath?: string;
  createdAt: string;
}

export class MediaStorageService {
  private memoryMedia: Map<string, MediaAssetRecord> = new Map();

  public async getAllMedia(workspaceId = "default-workspace"): Promise<MediaAssetRecord[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("media")
          .orderBy("createdAt", "desc")
          .get();

        const media: MediaAssetRecord[] = [];
        snapshot.forEach((doc) => {
          media.push(doc.data() as MediaAssetRecord);
        });
        return media;
      } catch (err) {
        console.warn("[MediaStorageService] Firestore getAllMedia failed, falling back:", err);
      }
    }

    return Array.from(this.memoryMedia.values()).filter(
      (m) => m.workspaceId === workspaceId
    );
  }

  public async saveMediaMetadata(
    media: Partial<MediaAssetRecord>,
    workspaceId = "default-workspace"
  ): Promise<MediaAssetRecord> {
    const id = media.id || `media_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const record: MediaAssetRecord = {
      id,
      workspaceId,
      ownerId: media.ownerId || "system_user",
      name: media.name || "Untitled Media",
      type: media.type || "image",
      mimeType: media.mimeType || (media.type === "video" ? "video/mp4" : "image/jpeg"),
      size: media.size || 1024 * 1024,
      url: media.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      storagePath: media.storagePath,
      createdAt: media.createdAt || new Date().toISOString(),
    };

    this.memoryMedia.set(id, record);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("media")
          .doc(id)
          .set(record, { merge: true });
      } catch (err) {
        console.warn("[MediaStorageService] Firestore saveMediaMetadata failed:", err);
      }
    }

    return record;
  }

  public async uploadBufferToStorage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    workspaceId = "default-workspace"
  ): Promise<MediaAssetRecord> {
    const id = `media_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const isVideo = mimeType.startsWith("video/");
    const storagePath = `workspaces/${workspaceId}/media/${id}/${filename}`;

    let publicUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bucket = getStorageBucket() as any;
    if (bucket) {
      try {
        const file = bucket.file(storagePath);
        await file.save(buffer, {
          metadata: { contentType: mimeType },
          public: true,
        });

        publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      } catch (err) {
        console.warn("[MediaStorageService] Firebase Storage upload failed:", err);
      }
    }

    return this.saveMediaMetadata(
      {
        id,
        workspaceId,
        name: filename,
        type: isVideo ? "video" : "image",
        mimeType,
        size: buffer.length,
        url: publicUrl,
        storagePath,
      },
      workspaceId
    );
  }

  public async getMediaById(id: string, workspaceId = "default-workspace"): Promise<MediaAssetRecord | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const doc = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("media")
          .doc(id)
          .get();

        if (doc.exists) {
          return doc.data() as MediaAssetRecord;
        }
      } catch (err) {
        console.warn("[MediaStorageService] Firestore getMediaById failed:", err);
      }
    }
    const mem = this.memoryMedia.get(id);
    return mem && mem.workspaceId === workspaceId ? mem : null;
  }

  public async deleteMedia(id: string, workspaceId = "default-workspace"): Promise<boolean> {
    const record = this.memoryMedia.get(id);
    this.memoryMedia.delete(id);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("media")
          .doc(id)
          .delete();
      } catch (err) {
        console.warn("[MediaStorageService] Firestore deleteMedia failed:", err);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bucket = getStorageBucket() as any;
    if (bucket && record?.storagePath) {
      try {
        await bucket.file(record.storagePath).delete();
      } catch (err) {
        console.warn("[MediaStorageService] Firebase Storage delete failed:", err);
      }
    }

    return true;
  }
}

export const mediaStorageService = new MediaStorageService();
