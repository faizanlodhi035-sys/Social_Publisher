import type { SocialPlatform } from "../../types/index.js";

export type AIOperation =
  | "caption"
  | "rewrite"
  | "ideas"
  | "hashtags"
  | "adapt"
  | "hooks";

export type AITone =
  | "professional"
  | "casual"
  | "friendly"
  | "funny"
  | "inspirational"
  | "promotional";

export type AICaptionLength = "short" | "medium" | "long";

export type AILanguage = "English" | "Urdu" | "Roman Urdu" | (string & {});

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface AICaptionRequest {
  topic: string;
  platform?: SocialPlatform;
  tone?: AITone;
  length?: AICaptionLength;
  keywords?: string[];
  language?: AILanguage;
  goal?: string;
  targetAudience?: string;
}

export interface AIRewriteRequest {
  originalCaption: string;
  platform?: SocialPlatform;
  tone?: AITone;
  length?: AICaptionLength;
  instructions?: string;
  language?: AILanguage;
}

export interface AIIdeasRequest {
  topic: string;
  platform?: SocialPlatform;
  tone?: AITone;
  count?: number;
  audience?: string;
  language?: AILanguage;
  style?: string;
}

export interface AIHashtagsRequest {
  topic: string;
  caption?: string;
  platform?: SocialPlatform;
  count?: number;
  keywords?: string[];
}

export interface AIAdaptRequest {
  originalContent: string;
  sourcePlatform: SocialPlatform;
  targetPlatform: SocialPlatform;
  tone?: AITone;
  length?: AICaptionLength;
  language?: AILanguage;
}

export interface AIHooksRequest {
  topic: string;
  platform?: SocialPlatform;
  count?: number;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface AICaptionResult {
  caption: string;
  title?: string;
  cta?: string;
  hashtags?: string[];
  platform: SocialPlatform;
  language: string;
}

export interface AIRewriteResult {
  improvedCaption: string;
  explanation?: string;
  platform: SocialPlatform;
}

export interface AIIdeaItem {
  id?: string;
  title: string;
  concept: string;
  hook: string;
  suggestedFormat: string;
}

export interface AIIdeasResult {
  ideas: AIIdeaItem[];
  platform: SocialPlatform;
  topic: string;
}

export interface AIHashtagsResult {
  hashtags: string[];
  groups?: {
    relevant?: string[];
    niche?: string[];
    trending?: string[];
  };
  platform: SocialPlatform;
}

export interface AIAdaptResult {
  adaptedContent: string;
  sourcePlatform: SocialPlatform;
  targetPlatform: SocialPlatform;
  explanation?: string;
}

export interface AIHooksResult {
  hooks: string[];
  platform: SocialPlatform;
}

// ============================================================================
// PROVIDER SPECIFICATIONS
// ============================================================================

export interface AITextRequest {
  systemInstruction?: string;
  prompt: string;
  responseMimeType?: "text/plain" | "application/json";
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface AITextResponse {
  text: string;
  model: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// ============================================================================
// USAGE METRICS (Safe metadata logged to Firestore)
// ============================================================================

export interface AIUsageRecord {
  id: string;
  userId: string;
  workspaceId: string;
  operation: AIOperation;
  platform: SocialPlatform;
  createdAt: number;
  success: boolean;
  latencyMs: number;
  model: string;
  error?: string;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
}
