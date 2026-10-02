import { authenticatedFetch } from "./apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface AnalyticsMetricCard {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export interface AnalyticsOverviewData {
  metrics: AnalyticsMetricCard[];
  followerGrowth: Array<{ date: string; followers: number }>;
  engagementByPlatform: Array<{ platform: string; rate: number; posts: number }>;
  topPerformingPosts: Array<{
    id: string;
    caption: string;
    platform: string;
    likes: number;
    shares: number;
    comments: number;
    reach: number;
  }>;
}

export const analyticsApi = {
  getOverview: async (platform?: string): Promise<AnalyticsOverviewData> => {
    const relativePath = platform && platform !== "All" 
      ? `${API_BASE_URL}/analytics/overview?platform=${encodeURIComponent(platform)}`
      : `${API_BASE_URL}/analytics/overview`;

    const response = await authenticatedFetch(relativePath, {
      headers: { Accept: "application/json" },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || "Failed to fetch analytics overview");
    }
    return data.data;
  },

  getPostsAnalytics: async (platform?: string) => {
    const relativePath = platform && platform !== "All"
      ? `${API_BASE_URL}/analytics/posts?platform=${encodeURIComponent(platform)}`
      : `${API_BASE_URL}/analytics/posts`;

    const response = await authenticatedFetch(relativePath, {
      headers: { Accept: "application/json" },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || "Failed to fetch post analytics");
    }
    return data.data;
  },
};
