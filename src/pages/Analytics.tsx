import React, { useEffect, useMemo, useState } from "react";
import { analyticsApi } from "../services/analyticsApi";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock3,
  Eye,
  FileVideo,
  Filter,
  Layers,
  MessageSquare,
  RefreshCw,
  Share2,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";
import { postStorage } from "../services/postStorage";

// ============================================================================
// TYPES & INTERFACES (Strict TypeScript, NO `any`)
// ============================================================================

export type DateRange = "7d" | "30d" | "90d" | "custom";
export type PlatformFilter = "all" | "instagram" | "facebook" | "tiktok" | "youtube";

export interface KPIMetric {
  id: string;
  title: string;
  value: string;
  rawValue: number;
  change: number; // percentage change (e.g. +14.2)
  period: string;
  isPositive: boolean;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  category: "content" | "engagement" | "audience";
}

export interface PlatformMetrics {
  id: "instagram" | "facebook" | "tiktok" | "youtube";
  name: string;
  handle: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  reach: string;
  impressions: string;
  engagement: string;
  followers: string;
  engagementRate: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  postCount: number;
}

export interface TrendPoint {
  date: string;
  reach: number;
  engagement: number;
  followers: number;
}

export interface TopPerformingPost {
  id: string;
  title: string;
  caption: string;
  platform: "instagram" | "facebook" | "tiktok" | "youtube";
  publishedAt: string;
  thumbnailGradient: string;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  shares: number;
  comments: number;
  saves: number;
  url?: string;
}

export interface RecentPerformanceSummary {
  recentReach: string;
  recentEngagement: string;
  recentFollowers: string;
  avgEngagementRate: string;
}

export interface AnalyticsDataset {
  overview: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    totalReach: number;
    totalImpressions: number;
    totalEngagement: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    followerGrowth: number;
    engagementRate: number;
  };
  changes: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    totalReach: number;
    totalImpressions: number;
    totalEngagement: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    followerGrowth: number;
    engagementRate: number;
  };
  trends: TrendPoint[];
  platforms: PlatformMetrics[];
  topPosts: TopPerformingPost[];
  recent: RecentPerformanceSummary;
}

// ============================================================================
// MOCK DATA ARCHITECTURE (Structured for easy future backend/API swapping)
// ============================================================================

const PLATFORM_CONFIG: Record<
  "instagram" | "facebook" | "tiktok" | "youtube",
  {
    name: string;
    handle: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    color: string;
    bgColor: string;
    borderColor: string;
    badgeBg: string;
  }
> = {
  instagram: {
    name: "Instagram",
    handle: "@creator_rb",
    icon: FaInstagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    badgeBg: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white",
  },
  facebook: {
    name: "Facebook",
    handle: "RB Creator Page",
    icon: FaFacebook,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeBg: "bg-blue-600 text-white",
  },
  tiktok: {
    name: "TikTok",
    handle: "@rbcreator",
    icon: FaTiktok,
    color: "text-slate-900",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
    badgeBg: "bg-slate-900 text-white",
  },
  youtube: {
    name: "YouTube",
    handle: "RB Creator Channel",
    icon: FaYoutube,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeBg: "bg-red-600 text-white",
  },
};

const BASE_TOP_POSTS: TopPerformingPost[] = [
  {
    id: "post-1",
    title: "5 AI Tools Every Creator Should Use in 2026",
    caption: "Stop wasting hours on manual editing. These AI productivity tools saved me 20+ hours this week! 🚀 #AI #ContentCreation",
    platform: "youtube",
    publishedAt: "2 days ago",
    thumbnailGradient: "from-rose-500 to-purple-600",
    impressions: 48200,
    reach: 41200,
    engagement: 4950,
    likes: 3820,
    shares: 890,
    comments: 240,
    saves: 1100,
  },
  {
    id: "post-2",
    title: "My Morning Productivity & Desk Setup Routine ☕",
    caption: "A realistic look into how I structure my studio mornings before creating content. What's your top morning habit?",
    platform: "instagram",
    publishedAt: "4 days ago",
    thumbnailGradient: "from-amber-400 to-pink-500",
    impressions: 34500,
    reach: 29800,
    engagement: 3810,
    likes: 3100,
    shares: 420,
    comments: 290,
    saves: 840,
  },
  {
    id: "post-3",
    title: "Behind the Scenes: Editing a Viral Short in 15 Mins 🎬",
    caption: "Here is the exact color grading and pacing breakdown for short form videos on TikTok and Reels.",
    platform: "tiktok",
    publishedAt: "5 days ago",
    thumbnailGradient: "from-cyan-500 to-blue-600",
    impressions: 62400,
    reach: 54100,
    engagement: 7120,
    likes: 5900,
    shares: 1220,
    comments: 480,
    saves: 1450,
  },
  {
    id: "post-4",
    title: "Why Most Creators Fail in Their First 90 Days",
    caption: "Consistency > Perfection. Here are 3 mindset shifts that helped me grow past 100K audience members across platforms.",
    platform: "facebook",
    publishedAt: "1 week ago",
    thumbnailGradient: "from-blue-600 to-indigo-700",
    impressions: 21800,
    reach: 19400,
    engagement: 2140,
    likes: 1750,
    shares: 210,
    comments: 180,
    saves: 310,
  },
  {
    id: "post-5",
    title: "Top 10 Video Editing Transitions Tutorial ✂️",
    caption: "Smooth cuts, jump transitions, and speed ramps explained in under 60 seconds.",
    platform: "instagram",
    publishedAt: "1 week ago",
    thumbnailGradient: "from-purple-600 to-pink-600",
    impressions: 29800,
    reach: 25400,
    engagement: 3240,
    likes: 2640,
    shares: 410,
    comments: 190,
    saves: 620,
  },
  {
    id: "post-6",
    title: "Full Studio Gear Guide 2026: Cameras, Lighting & Mics",
    caption: "Everything you need to build a high-converting video studio on a budget.",
    platform: "youtube",
    publishedAt: "2 weeks ago",
    thumbnailGradient: "from-red-500 to-amber-600",
    impressions: 51200,
    reach: 43900,
    engagement: 5420,
    likes: 4310,
    shares: 780,
    comments: 330,
    saves: 990,
  },
  {
    id: "post-7",
    title: "Day in the Life of a Full-Time Digital Publisher",
    caption: "From content ideation to multi-platform publishing. Follow along for 24 hours.",
    platform: "tiktok",
    publishedAt: "2 weeks ago",
    thumbnailGradient: "from-emerald-400 to-teal-600",
    impressions: 38900,
    reach: 33100,
    engagement: 4190,
    likes: 3480,
    shares: 510,
    comments: 200,
    saves: 430,
  },
];

// Helper to calculate mock data per DateRange and PlatformFilter
function getAnalyticsData(
  range: DateRange,
  platform: PlatformFilter,
  extraScheduledCount: number
): AnalyticsDataset {
  // Range multiplier factor
  const factor = range === "7d" ? 0.35 : range === "30d" ? 1.0 : range === "90d" ? 2.85 : 1.25;

  // Platform multiplier factor
  const platformMultiplier =
    platform === "all"
      ? 1.0
      : platform === "instagram"
      ? 0.35
      : platform === "youtube"
      ? 0.3
      : platform === "tiktok"
      ? 0.25
      : 0.1;

  const baseTotalPosts = Math.round(128 * factor * platformMultiplier);
  const basePublished = Math.round(96 * factor * platformMultiplier);
  const baseScheduled = Math.round(18 * platformMultiplier) + (platform === "all" ? extraScheduledCount : Math.ceil(extraScheduledCount / 4));

  const totalReach = Math.round(142500 * factor * platformMultiplier);
  const totalImpressions = Math.round(189400 * factor * platformMultiplier);
  const totalEngagement = Math.round(23800 * factor * platformMultiplier);
  const totalLikes = Math.round(18400 * factor * platformMultiplier);
  const totalComments = Math.round(2950 * factor * platformMultiplier);
  const totalShares = Math.round(1680 * factor * platformMultiplier);
  const totalSaves = Math.round(770 * factor * platformMultiplier);
  const followerGrowth = Math.round(3420 * factor * platformMultiplier);
  const engagementRate = Number((((totalEngagement / (totalReach || 1)) * 100)).toFixed(2));

  // Trend data generator
  const trendDays = range === "7d" ? 7 : range === "30d" ? 10 : range === "90d" ? 12 : 8;
  const trendPoints: TrendPoint[] = [];

  for (let i = 0; i < trendDays; i++) {
    const dayLabel =
      range === "7d"
        ? `Day ${i + 1}`
        : range === "30d"
        ? `Day ${i * 3 + 1}`
        : `Wk ${i + 1}`;

    const reachVal = Math.round((totalReach / trendDays) * (0.8 + Math.sin(i * 0.9) * 0.35));
    const engVal = Math.round((totalEngagement / trendDays) * (0.75 + Math.cos(i * 0.8) * 0.3));
    const folVal = Math.round((followerGrowth / trendDays) * (0.85 + Math.sin(i * 1.1) * 0.25));

    trendPoints.push({
      date: dayLabel,
      reach: reachVal,
      engagement: engVal,
      followers: folVal,
    });
  }

  // Filter top posts based on platform selection
  const filteredPosts =
    platform === "all"
      ? BASE_TOP_POSTS
      : BASE_TOP_POSTS.filter((p) => p.platform === platform);

  return {
    overview: {
      totalPosts: baseTotalPosts,
      publishedPosts: basePublished,
      scheduledPosts: baseScheduled,
      totalReach,
      totalImpressions,
      totalEngagement,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      followerGrowth,
      engagementRate: isNaN(engagementRate) ? 5.2 : engagementRate,
    },
    changes: {
      totalPosts: 12.5,
      publishedPosts: 18.2,
      scheduledPosts: 4.6,
      totalReach: 18.4,
      totalImpressions: 22.1,
      totalEngagement: 14.8,
      totalLikes: 12.3,
      totalComments: 9.7,
      totalShares: 28.5,
      totalSaves: 16.4,
      followerGrowth: 15.9,
      engagementRate: 2.4,
    },
    trends: trendPoints,
    platforms: [
      {
        id: "instagram",
        name: PLATFORM_CONFIG.instagram.name,
        handle: PLATFORM_CONFIG.instagram.handle,
        icon: PLATFORM_CONFIG.instagram.icon,
        reach: formatNumber(Math.round(49800 * factor)),
        impressions: formatNumber(Math.round(68400 * factor)),
        engagement: formatNumber(Math.round(9400 * factor)),
        followers: "42.8K",
        engagementRate: "6.1%",
        color: PLATFORM_CONFIG.instagram.color,
        bgColor: PLATFORM_CONFIG.instagram.bgColor,
        borderColor: PLATFORM_CONFIG.instagram.borderColor,
        badgeBg: PLATFORM_CONFIG.instagram.badgeBg,
        postCount: Math.round(42 * factor),
      },
      {
        id: "youtube",
        name: PLATFORM_CONFIG.youtube.name,
        handle: PLATFORM_CONFIG.youtube.handle,
        icon: PLATFORM_CONFIG.youtube.icon,
        reach: formatNumber(Math.round(42700 * factor)),
        impressions: formatNumber(Math.round(59300 * factor)),
        engagement: formatNumber(Math.round(7100 * factor)),
        followers: "28.4K",
        engagementRate: "5.4%",
        color: PLATFORM_CONFIG.youtube.color,
        bgColor: PLATFORM_CONFIG.youtube.bgColor,
        borderColor: PLATFORM_CONFIG.youtube.borderColor,
        badgeBg: PLATFORM_CONFIG.youtube.badgeBg,
        postCount: Math.round(28 * factor),
      },
      {
        id: "tiktok",
        name: PLATFORM_CONFIG.tiktok.name,
        handle: PLATFORM_CONFIG.tiktok.handle,
        icon: PLATFORM_CONFIG.tiktok.icon,
        reach: formatNumber(Math.round(35600 * factor)),
        impressions: formatNumber(Math.round(44200 * factor)),
        engagement: formatNumber(Math.round(5800 * factor)),
        followers: "36.1K",
        engagementRate: "4.8%",
        color: PLATFORM_CONFIG.tiktok.color,
        bgColor: PLATFORM_CONFIG.tiktok.bgColor,
        borderColor: PLATFORM_CONFIG.tiktok.borderColor,
        badgeBg: PLATFORM_CONFIG.tiktok.badgeBg,
        postCount: Math.round(36 * factor),
      },
      {
        id: "facebook",
        name: PLATFORM_CONFIG.facebook.name,
        handle: PLATFORM_CONFIG.facebook.handle,
        icon: PLATFORM_CONFIG.facebook.icon,
        reach: formatNumber(Math.round(14400 * factor)),
        impressions: formatNumber(Math.round(17500 * factor)),
        engagement: formatNumber(Math.round(1500 * factor)),
        followers: "12.5K",
        engagementRate: "3.2%",
        color: PLATFORM_CONFIG.facebook.color,
        bgColor: PLATFORM_CONFIG.facebook.bgColor,
        borderColor: PLATFORM_CONFIG.facebook.borderColor,
        badgeBg: PLATFORM_CONFIG.facebook.badgeBg,
        postCount: Math.round(22 * factor),
      },
    ],
    topPosts: filteredPosts,
    recent: {
      recentReach: formatNumber(Math.round(18400 * (factor * 0.4))),
      recentEngagement: formatNumber(Math.round(3200 * (factor * 0.4))),
      recentFollowers: formatNumber(Math.round(480 * (factor * 0.4))),
      avgEngagementRate: `${(5.4 * (platform === "all" ? 1 : 1.1)).toFixed(1)}%`,
    },
  };
}

// Utility number formatter (e.g., 142500 -> "142.5K")
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

// ============================================================================
// MAIN ANALYTICS COMPONENT
// ============================================================================

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customRangeModalOpen, setCustomRangeModalOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("2026-08-01");
  const [customEndDate, setCustomEndDate] = useState("2026-09-15");
  const [activeTrendMetric, setActiveTrendMetric] = useState<"reach" | "engagement" | "followers">("reach");
  const [simulatedError, setSimulatedError] = useState<string | null>(null);

  // Read scheduled posts count safely from postStorage
  const extraScheduledCount = useMemo(() => {
    return postStorage.getAllPosts().filter(p => p.status === "Scheduled").length;
  }, [isRefreshing]);

  // Derived dataset
  const dataset = useMemo(
    () => getAnalyticsData(dateRange, selectedPlatform, extraScheduledCount),
    [dateRange, selectedPlatform, extraScheduledCount]
  );

  // Sync with backend analytics API
  useEffect(() => {
    analyticsApi
      .getOverview(selectedPlatform)
      .then((data) => {
        console.log("[Analytics] Backend analytics overview loaded:", data);
      })
      .catch((err) => {
        console.warn("[Analytics] Could not fetch backend analytics, using structured fallback:", err);
      });
  }, [selectedPlatform]);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setSimulatedError(null);
    analyticsApi
      .getOverview(selectedPlatform)
      .then(() => setIsRefreshing(false))
      .catch(() => setIsRefreshing(false));
  };

  // KPI Overview Cards Array
  const kpiCards: KPIMetric[] = [
    {
      id: "total-posts",
      title: "Total Posts",
      value: dataset.overview.totalPosts.toLocaleString(),
      rawValue: dataset.overview.totalPosts,
      change: dataset.changes.totalPosts,
      period: "vs previous period",
      isPositive: true,
      icon: FileVideo,
      category: "content",
    },
    {
      id: "published-posts",
      title: "Published Posts",
      value: dataset.overview.publishedPosts.toLocaleString(),
      rawValue: dataset.overview.publishedPosts,
      change: dataset.changes.publishedPosts,
      period: "vs previous period",
      isPositive: true,
      icon: CheckCircle2,
      category: "content",
    },
    {
      id: "scheduled-posts",
      title: "Scheduled Posts",
      value: dataset.overview.scheduledPosts.toLocaleString(),
      rawValue: dataset.overview.scheduledPosts,
      change: dataset.changes.scheduledPosts,
      period: "upcoming queued",
      isPositive: true,
      icon: Clock3,
      category: "content",
    },
    {
      id: "reach",
      title: "Total Reach",
      value: formatNumber(dataset.overview.totalReach),
      rawValue: dataset.overview.totalReach,
      change: dataset.changes.totalReach,
      period: "vs previous period",
      isPositive: true,
      icon: Users,
      category: "engagement",
    },
    {
      id: "impressions",
      title: "Total Impressions",
      value: formatNumber(dataset.overview.totalImpressions),
      rawValue: dataset.overview.totalImpressions,
      change: dataset.changes.totalImpressions,
      period: "vs previous period",
      isPositive: true,
      icon: Eye,
      category: "engagement",
    },
    {
      id: "engagement",
      title: "Total Engagement",
      value: formatNumber(dataset.overview.totalEngagement),
      rawValue: dataset.overview.totalEngagement,
      change: dataset.changes.totalEngagement,
      period: "vs previous period",
      isPositive: true,
      icon: TrendingUp,
      category: "engagement",
    },
    {
      id: "likes",
      title: "Likes",
      value: formatNumber(dataset.overview.totalLikes),
      rawValue: dataset.overview.totalLikes,
      change: dataset.changes.totalLikes,
      period: "vs previous period",
      isPositive: true,
      icon: ThumbsUp,
      category: "engagement",
    },
    {
      id: "comments",
      title: "Comments",
      value: formatNumber(dataset.overview.totalComments),
      rawValue: dataset.overview.totalComments,
      change: dataset.changes.totalComments,
      period: "vs previous period",
      isPositive: true,
      icon: MessageSquare,
      category: "engagement",
    },
    {
      id: "shares",
      title: "Shares",
      value: formatNumber(dataset.overview.totalShares),
      rawValue: dataset.overview.totalShares,
      change: dataset.changes.totalShares,
      period: "vs previous period",
      isPositive: true,
      icon: Share2,
      category: "engagement",
    },
    {
      id: "saves",
      title: "Saves",
      value: formatNumber(dataset.overview.totalSaves),
      rawValue: dataset.overview.totalSaves,
      change: dataset.changes.totalSaves,
      period: "vs previous period",
      isPositive: true,
      icon: Bookmark,
      category: "engagement",
    },
    {
      id: "follower-growth",
      title: "Follower Growth",
      value: `+${formatNumber(dataset.overview.followerGrowth)}`,
      rawValue: dataset.overview.followerGrowth,
      change: dataset.changes.followerGrowth,
      period: "vs previous period",
      isPositive: true,
      icon: Sparkles,
      category: "audience",
    },
    {
      id: "engagement-rate",
      title: "Engagement Rate",
      value: `${dataset.overview.engagementRate}%`,
      rawValue: dataset.overview.engagementRate,
      change: dataset.changes.engagementRate,
      period: "vs industry avg (3.8%)",
      isPositive: true,
      icon: BarChart3,
      category: "audience",
    },
  ];

  // Helper for max value in trend points
  const maxTrendValue = useMemo(() => {
    return Math.max(...dataset.trends.map((t) => t[activeTrendMetric]), 100);
  }, [dataset.trends, activeTrendMetric]);

  return (
    <div className="space-y-6 pb-12">
      {/* ==================================================================== */}
      {/* 1. ANALYTICS HEADER & DATE RANGE CONTROLS                           */}
      {/* ==================================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your content performance and audience growth across connected platforms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Options */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            <button
              onClick={() => setDateRange("7d")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                dateRange === "7d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange("30d")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                dateRange === "30d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateRange("90d")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                dateRange === "90d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => {
                setDateRange("custom");
                setCustomRangeModalOpen(true);
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                dateRange === "custom"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar size={13} />
              Custom
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-slate-900" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Simulated Error Alert if triggered */}
      {simulatedError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600" />
            <span>{simulatedError}</span>
          </div>
          <button
            onClick={() => setSimulatedError(null)}
            className="text-xs font-bold text-rose-700 underline hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. PLATFORM FILTER TABS                                              */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <span className="mr-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Filter Platform:
        </span>

        {/* All Platforms */}
        <button
          onClick={() => setSelectedPlatform("all")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            selectedPlatform === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Layers size={14} />
          <span>All Platforms</span>
        </button>

        {/* Instagram */}
        <button
          onClick={() => setSelectedPlatform("instagram")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            selectedPlatform === "instagram"
              ? "bg-pink-600 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-pink-50 hover:text-pink-700"
          }`}
        >
          <FaInstagram size={14} className={selectedPlatform === "instagram" ? "text-white" : "text-pink-600"} />
          <span>Instagram</span>
        </button>

        {/* Facebook */}
        <button
          onClick={() => setSelectedPlatform("facebook")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            selectedPlatform === "facebook"
              ? "bg-blue-600 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          <FaFacebook size={14} className={selectedPlatform === "facebook" ? "text-white" : "text-blue-600"} />
          <span>Facebook</span>
        </button>

        {/* TikTok */}
        <button
          onClick={() => setSelectedPlatform("tiktok")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            selectedPlatform === "tiktok"
              ? "bg-slate-900 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <FaTiktok size={14} className={selectedPlatform === "tiktok" ? "text-white" : "text-slate-900"} />
          <span>TikTok</span>
        </button>

        {/* YouTube */}
        <button
          onClick={() => setSelectedPlatform("youtube")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            selectedPlatform === "youtube"
              ? "bg-red-600 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700"
          }`}
        >
          <FaYoutube size={14} className={selectedPlatform === "youtube" ? "text-white" : "text-red-600"} />
          <span>YouTube</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 9. LOADING STATE / SKELETON LOADER                                  */}
      {/* ==================================================================== */}
      {isRefreshing ? (
        <div className="space-y-6">
          {/* Skeleton KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-slate-100 p-4"
              />
            ))}
          </div>

          {/* Skeleton Chart & Cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 lg:col-span-2" />
            <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          </div>
        </div>
      ) : (
        <>
          {/* ================================================================ */}
          {/* 3. KPI OVERVIEW CARDS (12 Cards)                                 */}
          {/* ================================================================ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">KPI Overview</h2>
              <span className="text-xs text-slate-500">
                Range: <strong className="font-semibold text-slate-700 uppercase">{dateRange}</strong> | Platform:{" "}
                <strong className="font-semibold text-slate-700 capitalize">{selectedPlatform}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {kpiCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500 truncate">
                        {card.title}
                      </span>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                        <IconComponent size={15} />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        {card.value}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        <span
                          className={`inline-flex items-center gap-0.5 font-semibold ${
                            card.isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {card.isPositive ? (
                            <ArrowUpRight size={13} />
                          ) : (
                            <ArrowDownRight size={13} />
                          )}
                          {card.change > 0 ? `+${card.change}%` : `${card.change}%`}
                        </span>
                        <span className="text-slate-400 truncate">{card.period}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ================================================================ */}
          {/* 4. PERFORMANCE TRENDS & 8. RECENT PERFORMANCE                    */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* PERFORMANCE TRENDS CHART */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Performance Trends</h3>
                  <p className="text-xs text-slate-500">
                    Visualizing growth and engagement metrics over the selected period.
                  </p>
                </div>

                {/* Metric Selector Tabs */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    onClick={() => setActiveTrendMetric("reach")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      activeTrendMetric === "reach"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Reach
                  </button>
                  <button
                    onClick={() => setActiveTrendMetric("engagement")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      activeTrendMetric === "engagement"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Engagement
                  </button>
                  <button
                    onClick={() => setActiveTrendMetric("followers")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      activeTrendMetric === "followers"
                        ? "bg-violet-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Followers
                  </button>
                </div>
              </div>

              {/* Responsive SVG & CSS Chart Render */}
              <div className="mt-6">
                <div className="h-56 w-full">
                  <svg className="h-full w-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={
                            activeTrendMetric === "reach"
                              ? "#6366f1"
                              : activeTrendMetric === "engagement"
                              ? "#10b981"
                              : "#8b5cf6"
                          }
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor={
                            activeTrendMetric === "reach"
                              ? "#6366f1"
                              : activeTrendMetric === "engagement"
                              ? "#10b981"
                              : "#8b5cf6"
                          }
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line x1="0" y1="10" x2="500" y2="10" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="55" x2="500" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="145" x2="500" y2="145" stroke="#f1f5f9" strokeWidth="1" />

                    {/* Chart Points Calculation */}
                    {(() => {
                      const points = dataset.trends.map((pt, idx) => {
                        const x = (idx / (dataset.trends.length - 1 || 1)) * 500;
                        const val = pt[activeTrendMetric];
                        const y = 160 - (val / (maxTrendValue || 1)) * 140;
                        return { x, y, val, date: pt.date };
                      });

                      const pathD = points.reduce((acc, pt, i) => {
                        return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                      }, "");

                      const areaD = `${pathD} L 500 160 L 0 160 Z`;

                      const strokeColor =
                        activeTrendMetric === "reach"
                          ? "#6366f1"
                          : activeTrendMetric === "engagement"
                          ? "#10b981"
                          : "#8b5cf6";

                      return (
                        <g>
                          <path d={areaD} fill="url(#trendGradient)" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {points.map((pt, i) => (
                            <g key={i} className="group/node cursor-pointer">
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="4"
                                fill="#ffffff"
                                stroke={strokeColor}
                                strokeWidth="2.5"
                                className="transition-all group-hover/node:r-6"
                              />
                            </g>
                          ))}
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* X-Axis Labels */}
                <div className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-xs font-medium text-slate-400">
                  {dataset.trends.map((pt, idx) => (
                    <span key={idx}>{pt.date}</span>
                  ))}
                </div>

                {/* Legend & Summary Footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                      Reach
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      Engagement
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                      Followers
                    </span>
                  </div>

                  <span className="text-slate-500">
                    Highest peak:{" "}
                    <strong className="font-semibold text-slate-900">
                      {formatNumber(maxTrendValue)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 8. RECENT PERFORMANCE & 6. FOLLOWER GROWTH SUMMARY */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Recent Performance</h3>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    Live Overview
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Snapshot of your content impact over recent activity cycles.
                </p>

                <div className="mt-5 space-y-3.5">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Recent Reach</p>
                        <p className="text-sm font-bold text-slate-900">{dataset.recent.recentReach}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">+14.2%</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Recent Engagement</p>
                        <p className="text-sm font-bold text-slate-900">{dataset.recent.recentEngagement}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">+18.5%</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">New Followers</p>
                        <p className="text-sm font-bold text-slate-900">+{dataset.recent.recentFollowers}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">+9.4%</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <BarChart3 size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Avg Engagement Rate</p>
                        <p className="text-sm font-bold text-slate-900">{dataset.recent.avgEngagementRate}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">+0.8%</span>
                  </div>
                </div>
              </div>

              {/* Dedicated Follower Growth Mini Card */}
              <div className="mt-5 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-900">Follower Growth Summary</span>
                  <span className="text-xs font-extrabold text-violet-700">
                    +{formatNumber(dataset.overview.followerGrowth)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-violet-600">
                  Total audience across all platforms is growing steadily (+15.9% vs previous period).
                </p>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 5. PLATFORM BREAKDOWN                                            */}
          {/* ================================================================ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Platform Breakdown</h2>
                <p className="text-xs text-slate-500">
                  Performance metrics across connected social channels.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {dataset.platforms.map((platform) => {
                const PlatformIcon = platform.icon;
                const isSelected =
                  selectedPlatform === "all" || selectedPlatform === platform.id;

                if (!isSelected) return null;

                return (
                  <div
                    key={platform.id}
                    className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${platform.borderColor}`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs ${platform.badgeBg}`}
                          >
                            <PlatformIcon size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{platform.name}</h4>
                            <p className="text-xs text-slate-500">{platform.handle}</p>
                          </div>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {platform.postCount} posts
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <p className="text-[11px] text-slate-500">Reach</p>
                          <p className="text-sm font-bold text-slate-900">{platform.reach}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <p className="text-[11px] text-slate-500">Impressions</p>
                          <p className="text-sm font-bold text-slate-900">{platform.impressions}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <p className="text-[11px] text-slate-500">Engagement</p>
                          <p className="text-sm font-bold text-slate-900">{platform.engagement}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <p className="text-[11px] text-slate-500">Eng. Rate</p>
                          <p className="text-sm font-bold text-emerald-600">{platform.engagementRate}</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="text-slate-500">Followers</span>
                      <span className="font-bold text-slate-900">{platform.followers}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ================================================================ */}
          {/* 7. TOP PERFORMING POSTS & 10. EMPTY STATE                         */}
          {/* ================================================================ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Top Performing Posts</h2>
                <p className="text-xs text-slate-500">
                  Posts with the highest reach, views, and audience engagement.
                </p>
              </div>
            </div>

            {dataset.topPosts.length === 0 ? (
              // 10. REUSABLE EMPTY STATE
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Filter size={24} />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  No posts found for this platform
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Connect your social account and publish content to start seeing top-performing posts insights.
                </p>
                <button
                  onClick={() => setSelectedPlatform("all")}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
                >
                  Reset Platform Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dataset.topPosts.map((post) => {
                  const PlatformIcon = PLATFORM_CONFIG[post.platform].icon;
                  return (
                    <div
                      key={post.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                    >
                      {/* Post Thumbnail Banner */}
                      <div
                        className={`relative h-28 w-full bg-gradient-to-tr ${post.thumbnailGradient} p-4 text-white`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-[11px] font-semibold backdrop-blur-xs`}
                          >
                            <PlatformIcon size={12} />
                            <span className="capitalize">{post.platform}</span>
                          </span>
                          <span className="text-[11px] font-medium opacity-90">{post.publishedAt}</span>
                        </div>

                        <div className="absolute bottom-3 left-4 right-4">
                          <h4 className="line-clamp-1 text-sm font-bold text-white drop-shadow-xs">
                            {post.title}
                          </h4>
                        </div>
                      </div>

                      {/* Post Content Body */}
                      <div className="flex flex-1 flex-col justify-between p-4">
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {post.caption}
                        </p>

                        {/* Metric Pills */}
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                              Reach
                            </span>
                            <span className="font-bold text-slate-900">
                              {formatNumber(post.reach)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                              Engagement
                            </span>
                            <span className="font-bold text-emerald-600">
                              {formatNumber(post.engagement)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                              Likes
                            </span>
                            <span className="font-bold text-slate-900">
                              {formatNumber(post.likes)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ==================================================================== */}
      {/* CUSTOM DATE RANGE MODAL                                              */}
      {/* ==================================================================== */}
      {customRangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Select Custom Date Range</h3>
              <button
                onClick={() => setCustomRangeModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCustomRangeModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setCustomRangeModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
