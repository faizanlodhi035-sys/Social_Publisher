export type SocialPlatform = "Instagram" | "Facebook" | "TikTok" | "YouTube";

export type ConnectionStatus = "connected" | "needs_attention" | "disconnected" | "error";

export interface AccountTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Epoch timestamp in ms
  tokenType?: string;
  scope?: string;
}

export interface ConnectedAccount {
  id: string;
  platform: SocialPlatform;
  platformAccountId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: ConnectionStatus;
  connectedAt: string;
  updatedAt: string;
  capabilities: {
    publish: boolean;
    analytics: boolean;
  };
}

export interface StoredAccountRecord extends ConnectedAccount {
  tokens: AccountTokens;
}

export interface PublishRequestPayload {
  accountId: string;
  caption: string;
  mediaUrls?: string[];
  scheduledAt?: string;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  platform: SocialPlatform;
  status: "published" | "scheduled" | "failed";
  publishedAt?: string;
  error?: string;
}

export interface ProviderAuthStatus {
  platform: SocialPlatform;
  configured: boolean;
  missingEnvVars: string[];
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
