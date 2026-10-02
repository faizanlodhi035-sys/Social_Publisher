export type SocialPlatform = "Instagram" | "Facebook" | "TikTok" | "YouTube";

export type ConnectionStatus = "connected" | "needs_attention" | "disconnected" | "connecting" | "error";

export interface ConnectedSocialAccount {
  id: string;
  platform: SocialPlatform;
  platformAccountId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: ConnectionStatus;
  connectedAt: string;
  expiresAt?: string;
}

export interface ProviderCapabilities {
  image: boolean;
  video: boolean;
  reels: boolean;
  stories: boolean;
  shorts: boolean;
  scheduling: boolean;
  captionLimit: number;
}

export interface PublishRequest {
  accountId: string;
  caption: string;
  mediaIds: string[];
  scheduleDate?: string;
  scheduleTime?: string;
}

export type PublishState = "idle" | "validating" | "uploading" | "publishing" | "published" | "failed";

export interface PublishResponse {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface OAuthState {
  platform: SocialPlatform;
  stateToken: string;
}
