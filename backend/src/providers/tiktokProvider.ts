import { envConfig } from "../config/env.js";
import type { AccountTokens, PublishRequestPayload, PublishResult, SocialPlatform } from "../types/index.js";
import { OAuthCallbackError, PublishFailedError } from "../utils/errors.js";
import type { AccountInfo, ISocialProvider } from "./baseProvider.js";

export class TikTokProvider implements ISocialProvider {
  public platform: SocialPlatform = "TikTok";

  public isConfigured(): boolean {
    return Boolean(envConfig.tiktok.clientKey && envConfig.tiktok.clientSecret);
  }

  public getMissingEnvVars(): string[] {
    const missing: string[] = [];
    if (!envConfig.tiktok.clientKey) missing.push("TIKTOK_CLIENT_KEY");
    if (!envConfig.tiktok.clientSecret) missing.push("TIKTOK_CLIENT_SECRET");
    return missing;
  }

  public getAuthorizationUrl(state: string): string {
    if (envConfig.tiktok.clientKey.startsWith("demo_")) {
      return `${envConfig.tiktok.redirectUri}?code=demo_tiktok_code&state=${state}`;
    }

    const params = new URLSearchParams({
      client_key: envConfig.tiktok.clientKey,
      scope: "user.info.basic,video.upload,video.publish",
      response_type: "code",
      redirect_uri: envConfig.tiktok.redirectUri,
      state,
    });

    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  public async exchangeCodeForTokens(code: string): Promise<{ tokens: AccountTokens; accounts: AccountInfo[] }> {
    if (!this.isConfigured()) {
      throw new OAuthCallbackError("TikTok OAuth is not configured on the backend server.");
    }

    if (code.startsWith("demo_") || envConfig.tiktok.clientKey.startsWith("demo_")) {
      return {
        tokens: {
          accessToken: "demo_tiktok_access_token_" + Date.now(),
          refreshToken: "demo_tiktok_refresh_token_" + Date.now(),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tokenType: "bearer",
        },
        accounts: [
          {
            platformAccountId: "tiktok_demo_acc_101",
            platform: "TikTok",
            username: "@tiktok_creator",
            displayName: "TikTok Creator",
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
            capabilities: { publish: true, analytics: true },
          },
        ],
      };
    }

    try {
      const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache",
        },
        body: new URLSearchParams({
          client_key: envConfig.tiktok.clientKey,
          client_secret: envConfig.tiktok.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: envConfig.tiktok.redirectUri,
        }).toString(),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;

      if (!res.ok || data.error || data.data?.error_code) {
        throw new Error(data.error?.message || data.message || "TikTok OAuth token exchange failed");
      }

      const tokenData = data.data || data;
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined;

      const tokens: AccountTokens = {
        accessToken,
        refreshToken,
        expiresAt,
        tokenType: "bearer",
        scope: tokenData.scope,
      };

      // Fetch user profile info
      let accountInfo: AccountInfo = {
        platformAccountId: tokenData.open_id || `tiktok_user_${Date.now()}`,
        platform: "TikTok",
        username: "@tiktok_creator",
        displayName: "TikTok Creator",
        capabilities: { publish: true, analytics: true },
      };

      try {
        const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        
        const userData = (await userRes.json()) as any;
        console.log("TikTok user info response:", userData);
        
        if (userData.data?.user) {
          const u = userData.data.user;
          accountInfo = {
            platformAccountId: u.open_id || accountInfo.platformAccountId,
            platform: "TikTok",
            username: u.display_name ? `@${u.display_name.toLowerCase().replace(/\s+/g, "_")}` : accountInfo.username,
            displayName: u.display_name || accountInfo.displayName,
            avatarUrl: u.avatar_url,
            capabilities: { publish: true, analytics: true },
          };
        } else if (userData.error) {
          console.error("TikTok user info error:", userData.error);
        }
      } catch (err) {
        console.error("TikTok user profile fetch failed:", err);
        // Fallback to basic account info if profile call fails
      }

      return { tokens, accounts: [accountInfo] };
    } catch (err) {
      throw new OAuthCallbackError(err instanceof Error ? err.message : "TikTok code exchange failed", err);
    }
  }

  public async refreshAccessToken(refreshToken: string): Promise<AccountTokens> {
    if (refreshToken.startsWith("demo_") || envConfig.tiktok.clientKey.startsWith("demo_")) {
      return {
        accessToken: "demo_tiktok_access_token_" + Date.now(),
        refreshToken,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
    }

    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: envConfig.tiktok.clientKey,
        client_secret: envConfig.tiktok.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to refresh TikTok token");
    }

    const t = data.data || data;
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token || refreshToken,
      expiresAt: t.expires_in ? Date.now() + t.expires_in * 1000 : undefined,
    };
  }

  public async publishPost(
    account: { platformAccountId: string; username: string },
    tokens: AccountTokens,
    payload: PublishRequestPayload
  ): Promise<PublishResult> {
    if (!tokens.accessToken) {
      throw new PublishFailedError("Valid access token missing for TikTok.");
    }

    if (tokens.accessToken.startsWith("demo_")) {
      return {
        success: true,
        postId: `tiktok_demo_post_${Date.now()}`,
        platform: "TikTok",
        status: "published",
        publishedAt: new Date().toISOString(),
      };
    }

    try {
      // Initiate video post via TikTok Content Posting API
      const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: payload.caption,
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_stitch: false,
            disable_comment: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: payload.mediaUrls?.[0] || "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
          },
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initData = (await initRes.json()) as any;
      if (!initRes.ok || initData.error?.code !== "ok") {
        throw new Error(initData.error?.message || "TikTok post initialization failed");
      }

      return {
        success: true,
        postId: initData.data?.publish_id || `tiktok_publish_${Date.now()}`,
        platform: "TikTok",
        status: "published",
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      throw new PublishFailedError(err instanceof Error ? err.message : "TikTok video publish failed", err);
    }
  }
}
