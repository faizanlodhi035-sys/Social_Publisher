import { authenticatedFetch } from "./apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface GenerateCaptionPayload {
  topic: string;
  platform?: string;
  tone?: string;
  goal?: string;
  targetAudience?: string;
  language?: string;
  length?: "short" | "medium" | "long";
  keywords?: string[];
}

export interface RewriteCaptionPayload {
  originalCaption: string;
  platform?: string;
  tone?: string;
  length?: "short" | "medium" | "long";
  instructions?: string;
  language?: string;
}

export interface GenerateIdeasPayload {
  topic: string;
  platform?: string;
  tone?: string;
  count?: number;
  audience?: string;
  language?: string;
  style?: string;
}

export interface GenerateHashtagsPayload {
  topic: string;
  caption?: string;
  platform?: string;
  count?: number;
  keywords?: string[];
}

export interface AdaptContentPayload {
  originalContent: string;
  sourcePlatform: string;
  targetPlatform: string;
  tone?: string;
  length?: "short" | "medium" | "long";
  language?: string;
}

export interface GenerateHooksPayload {
  topic: string;
  platform?: string;
  count?: number;
}

export interface AICaptionResponse {
  caption: string;
  text: string; // compatibility helper
  title?: string;
  cta?: string;
  hashtags?: string[];
  platform: string;
  language: string;
}

export interface AIRewriteResponse {
  improvedCaption: string;
  text: string; // compatibility helper
  explanation?: string;
  platform: string;
}

export interface AIIdeaItem {
  id: string;
  title: string;
  concept: string;
  hook: string;
  suggestedFormat: string;
}

export interface AIIdeasResponse {
  ideas: AIIdeaItem[];
  platform: string;
  topic: string;
}

export interface AIHashtagsResponse {
  hashtags: string[];
  groups?: {
    relevant?: string[];
    niche?: string[];
    trending?: string[];
  };
  platform: string;
}

export interface AIAdaptResponse {
  adaptedContent: string;
  sourcePlatform: string;
  targetPlatform: string;
  explanation?: string;
}

export const aiApi = {
  generateCaption: async (payload: GenerateCaptionPayload): Promise<AICaptionResponse> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/ai/caption`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || "Failed to generate caption");
    }
    return {
      ...data.data,
      text: data.data.caption || data.data.text || "",
    };
  },

  rewriteCaption: async (payload: RewriteCaptionPayload): Promise<AIRewriteResponse> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/ai/rewrite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || "Failed to rewrite caption");
    }
    return {
      ...data.data,
      text: data.data.improvedCaption || "",
    };
  },

  generateContentIdeas: async (payload: GenerateIdeasPayload): Promise<AIIdeasResponse> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/ai/ideas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || "Failed to generate content ideas");
    }
    return data.data;
  },

  generateHashtags: async (payload: GenerateHashtagsPayload): Promise<AIHashtagsResponse> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/ai/hashtags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || "Failed to generate hashtags");
    }
    return data.data;
  },

  adaptContent: async (payload: AdaptContentPayload): Promise<AIAdaptResponse> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/ai/adapt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || "Failed to adapt content");
    }
    return data.data;
  },

  // Legacy compatibility for existing hook callers
  generateHooks: async (payload: GenerateHooksPayload): Promise<{ hooks: string[]; platform: string }> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/ai/hooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || "Failed to generate hooks");
    }
    return data.data;
  },

  getAIStatus: async (): Promise<{
    provider: string;
    model: string;
    supportedPlatforms: string[];
    supportedOperations: string[];
    languages: string[];
  }> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/ai/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to fetch AI status");
    }
    return data.data;
  },
};
