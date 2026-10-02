import type {
  AccountTokens,
  PublishRequestPayload,
  PublishResult,
  SocialPlatform,
} from "../types/index.js";

export interface AccountInfo {
  platformAccountId: string;
  platform: SocialPlatform;
  username: string;
  displayName: string;
  avatarUrl?: string;
  capabilities?: { publish: boolean; analytics: boolean };
}

export interface ISocialProvider {
  platform: SocialPlatform;
  isConfigured(): boolean;
  getMissingEnvVars(): string[];
  getAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<{ tokens: AccountTokens; accounts: AccountInfo[] }>;
  refreshAccessToken(refreshToken: string): Promise<AccountTokens>;
  publishPost(account: { platformAccountId: string; username: string }, tokens: AccountTokens, payload: PublishRequestPayload): Promise<PublishResult>;
}
