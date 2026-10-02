import { getFirestoreDb, isFirebaseConfigured } from "../firebase/admin.js";
import type { SocialPlatform } from "../types/index.js";

export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  impressions: number;
  followers: number;
  engagementRate: number;
}

export interface EngagementSnapshot {
  id: string;
  workspaceId: string;
  accountId: string;
  platform: SocialPlatform;
  postId?: string;
  timestamp: number;
  metrics: EngagementMetrics;
  source: string;
  externalId?: string;
}

export class EngagementRepository {
  private memorySnapshots: Map<string, EngagementSnapshot> = new Map();

  constructor() {
    this.seedDefaultEngagementData();
  }

  private seedDefaultEngagementData() {
    const now = Date.now();
    const mockSnapshots: EngagementSnapshot[] = [
      {
        id: "snap_1",
        workspaceId: "default-workspace",
        accountId: "instagram-default",
        platform: "Instagram",
        timestamp: now - 86400000 * 2,
        metrics: {
          likes: 1240,
          comments: 89,
          shares: 45,
          views: 18500,
          reach: 14200,
          impressions: 21000,
          followers: 4850,
          engagementRate: 4.8,
        },
        source: "webhook_event",
      },
      {
        id: "snap_2",
        workspaceId: "default-workspace",
        accountId: "facebook-default",
        platform: "Facebook",
        timestamp: now - 86400000 * 1,
        metrics: {
          likes: 850,
          comments: 64,
          shares: 110,
          views: 9400,
          reach: 8100,
          impressions: 12500,
          followers: 3200,
          engagementRate: 3.5,
        },
        source: "api_sync",
      },
      {
        id: "snap_3",
        workspaceId: "default-workspace",
        accountId: "tiktok-default",
        platform: "TikTok",
        timestamp: now - 3600000 * 5,
        metrics: {
          likes: 3420,
          comments: 310,
          shares: 580,
          views: 45000,
          reach: 39000,
          impressions: 52000,
          followers: 12400,
          engagementRate: 7.2,
        },
        source: "webhook_event",
      },
    ];

    mockSnapshots.forEach((snap) => this.memorySnapshots.set(snap.id, snap));
  }

  public async saveSnapshot(
    snapshot: Partial<EngagementSnapshot>,
    workspaceId = "default-workspace"
  ): Promise<EngagementSnapshot> {
    const id = snapshot.id || `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullSnapshot: EngagementSnapshot = {
      id,
      workspaceId,
      accountId: snapshot.accountId || "default-account",
      platform: snapshot.platform || "Instagram",
      postId: snapshot.postId,
      timestamp: snapshot.timestamp || Date.now(),
      metrics: snapshot.metrics || {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        reach: 0,
        impressions: 0,
        followers: 0,
        engagementRate: 0,
      },
      source: snapshot.source || "manual_sync",
      externalId: snapshot.externalId,
    };

    this.memorySnapshots.set(id, fullSnapshot);

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("engagementSnapshots")
          .doc(id)
          .set(fullSnapshot, { merge: true });
      } catch (err) {
        console.warn("[EngagementRepository] saveSnapshot failed:", err);
      }
    }

    return fullSnapshot;
  }

  public async getSnapshots(
    platform?: string,
    workspaceId = "default-workspace"
  ): Promise<EngagementSnapshot[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        let query: any = db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("engagementSnapshots")
          .orderBy("timestamp", "desc");

        if (platform && platform !== "All") {
          query = query.where("platform", "==", platform);
        }

        const snapshot = await query.get();
        const results: EngagementSnapshot[] = [];
        snapshot.forEach((doc: any) => results.push(doc.data() as EngagementSnapshot));
        if (results.length > 0) return results;
      } catch (err) {
        console.warn("[EngagementRepository] getSnapshots failed, falling back:", err);
      }
    }

    let items = Array.from(this.memorySnapshots.values());
    if (platform && platform !== "All") {
      items = items.filter((i) => i.platform.toLowerCase() === platform.toLowerCase());
    }
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }

  public async getAggregatedAnalytics(
    platform?: string,
    workspaceId = "default-workspace"
  ) {
    const snapshots = await this.getSnapshots(platform, workspaceId);

    let totalReach = 0;
    let totalImpressions = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalViews = 0;
    let totalFollowers = 0;

    const platformBreakdown: Record<string, { reach: number; engagement: number; posts: number }> = {};

    for (const snap of snapshots) {
      totalReach += snap.metrics.reach || 0;
      totalImpressions += snap.metrics.impressions || 0;
      totalLikes += snap.metrics.likes || 0;
      totalComments += snap.metrics.comments || 0;
      totalShares += snap.metrics.shares || 0;
      totalViews += snap.metrics.views || 0;
      totalFollowers = Math.max(totalFollowers, snap.metrics.followers || 0);

      const p = snap.platform;
      if (!platformBreakdown[p]) {
        platformBreakdown[p] = { reach: 0, engagement: 0, posts: 0 };
      }
      platformBreakdown[p].reach += snap.metrics.reach || 0;
      platformBreakdown[p].engagement += (snap.metrics.likes || 0) + (snap.metrics.comments || 0);
      platformBreakdown[p].posts += 1;
    }

    const totalEngagement = totalLikes + totalComments + totalShares;
    const engagementRate = totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0;

    return {
      reach: totalReach,
      impressions: totalImpressions,
      engagementRate,
      followers: totalFollowers,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      views: totalViews,
      platforms: Object.entries(platformBreakdown).map(([name, stats]) => ({
        name,
        reach: stats.reach,
        engagement: stats.engagement,
        posts: stats.posts,
      })),
      topPosts: snapshots.slice(0, 5),
    };
  }
}

export const engagementRepository = new EngagementRepository();
