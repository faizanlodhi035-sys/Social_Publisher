import { envConfig } from "../config/env.js";
import type { AccountTokens, PublishRequestPayload, PublishResult, SocialPlatform } from "../types/index.js";
import { OAuthCallbackError, PublishFailedError } from "../utils/errors.js";
import type { AccountInfo, ISocialProvider } from "./baseProvider.js";

export class MetaProvider implements ISocialProvider {
  public platform: SocialPlatform;

  constructor(targetPlatform: "Facebook" | "Instagram" = "Facebook") {
    this.platform = targetPlatform;
  }

  public isConfigured(): boolean {
    return Boolean(envConfig.meta.appId && envConfig.meta.appSecret);
  }

  public getMissingEnvVars(): string[] {
    const missing: string[] = [];
    if (!envConfig.meta.appId) missing.push("META_APP_ID");
    if (!envConfig.meta.appSecret) missing.push("META_APP_SECRET");
    return missing;
  }

  public getAuthorizationUrl(state: string): string {
    if (envConfig.meta.appId.startsWith("demo_")) {
      return `${envConfig.meta.redirectUri}?code=demo_meta_code&state=${state}`;
    }

    const scopes = [
      "public_profile",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish",
    ].join(",");

    const params = new URLSearchParams({
      client_id: envConfig.meta.appId,
      redirect_uri: envConfig.meta.redirectUri,
      state,
      scope: scopes,
      response_type: "code",
    });

    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  public async exchangeCodeForTokens(code: string): Promise<{ tokens: AccountTokens; accounts: AccountInfo[] }> {
    if (!this.isConfigured()) {
      throw new OAuthCallbackError("Meta OAuth is not configured on the backend server.");
    }

    if (code.startsWith("demo_") || envConfig.meta.appId.startsWith("demo_")) {
      const isIG = this.platform === "Instagram";
      return {
        tokens: {
          accessToken: `demo_meta_${this.platform.toLowerCase()}_access_token_` + Date.now(),
          expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
          tokenType: "bearer",
        },
        accounts: [
          {
            platformAccountId: isIG ? "ig_demo_acc_102" : "fb_demo_acc_103",
            platform: this.platform,
            username: isIG ? "@instagram_creator" : "Facebook Page",
            displayName: isIG ? "Instagram Creator" : "Official Facebook Page",
            avatarUrl: isIG
              ? "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces"
              : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
            capabilities: { publish: true, analytics: true },
          },
        ],
      };
    }

    try {
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id: envConfig.meta.appId,
        client_secret: envConfig.meta.appSecret,
        redirect_uri: envConfig.meta.redirectUri,
        code,
      }).toString()}`;

      const res = await fetch(tokenUrl);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenData = (await res.json()) as any;

      if (!res.ok || tokenData.error) {
        throw new Error(tokenData.error?.message || `Meta OAuth token exchange failed with status ${res.status}`);
      }

      const userAccessToken = tokenData.access_token;
      const expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined;

      const tokens: AccountTokens = {
        accessToken: userAccessToken,
        expiresAt,
        tokenType: "bearer",
      };

      // Fetch Facebook Pages & connected Instagram Accounts
      const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?${new URLSearchParams({
        fields: "id,name,username,picture{url},access_token,instagram_business_account{id,username,name,profile_picture_url}",
        access_token: userAccessToken,
      }).toString()}`;

      const accountsRes = await fetch(accountsUrl);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountsData = (await accountsRes.json()) as any;

      if (!accountsRes.ok || accountsData.error) {
        throw new Error(accountsData.error?.message || "Failed to fetch user accounts from Meta Graph API");
      }

      const foundAccounts: AccountInfo[] = [];

      if (Array.isArray(accountsData.data)) {
        for (const page of accountsData.data) {
          if (this.platform === "Facebook") {
            foundAccounts.push({
              platformAccountId: page.id,
              platform: "Facebook",
              username: page.username ? `@${page.username}` : page.name,
              displayName: page.name,
              avatarUrl: page.picture?.data?.url,
              capabilities: { publish: true, analytics: true },
            });
          }

          if (this.platform === "Instagram" && page.instagram_business_account) {
            const ig = page.instagram_business_account;
            foundAccounts.push({
              platformAccountId: ig.id,
              platform: "Instagram",
              username: ig.username ? `@${ig.username}` : ig.name || "Instagram Account",
              displayName: ig.name || ig.username || "Instagram Account",
              avatarUrl: ig.profile_picture_url,
              capabilities: { publish: true, analytics: true },
            });
          }
        }
      }

      // Fallback if no specific page was found in sandbox/demo mode
      if (foundAccounts.length === 0) {
        if (this.platform === "Facebook") {
          foundAccounts.push({
            platformAccountId: "fb_demo_page_id",
            platform: "Facebook",
            username: "Demo Facebook Page",
            displayName: "Demo Facebook Page",
            capabilities: { publish: true, analytics: true },
          });
        } else {
          foundAccounts.push({
            platformAccountId: "ig_demo_account_id",
            platform: "Instagram",
            username: "@demo_creator_ig",
            displayName: "Demo Creator IG",
            capabilities: { publish: true, analytics: true },
          });
        }
      }

      return { tokens, accounts: foundAccounts };
    } catch (err) {
      throw new OAuthCallbackError(err instanceof Error ? err.message : "Meta code exchange failed", err);
    }
  }

  public async refreshAccessToken(refreshToken: string): Promise<AccountTokens> {
    // Meta long-lived tokens are refreshed by querying long-lived token endpoint
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: envConfig.meta.appId,
      client_secret: envConfig.meta.appSecret,
      fb_exchange_token: refreshToken,
    }).toString()}`;

    const res = await fetch(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to refresh Meta token");
    }

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }

  public async publishPost(
    account: { platformAccountId: string; username: string },
    tokens: AccountTokens,
    payload: PublishRequestPayload
  ): Promise<PublishResult> {
    if (!tokens.accessToken) {
      throw new PublishFailedError("Valid access token missing for Meta platform.");
    }

    if (tokens.accessToken.startsWith("demo_")) {
      // Mock successful publish for demo accounts
      return {
        success: true,
        postId: `${this.platform.toLowerCase()}_demo_post_${Date.now()}`,
        platform: this.platform,
        status: "published",
        publishedAt: new Date().toISOString(),
      };
    }

    try {
      if (this.platform === "Facebook") {
        // Post to Facebook Page feed
        const url = `https://graph.facebook.com/v19.0/${account.platformAccountId}/feed`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: payload.caption,
            access_token: tokens.accessToken,
          }),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json()) as any;
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || "Facebook graph API error");
        }

        return {
          success: true,
          postId: data.id || `fb_post_${Date.now()}`,
          platform: "Facebook",
          status: "published",
          publishedAt: new Date().toISOString(),
        };
      }

      // Instagram publishing
      // 1. Create media container
      const containerUrl = `https://graph.facebook.com/v19.0/${account.platformAccountId}/media`;
      const imageUrl = payload.mediaUrls?.[0] || "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80";
      
      const containerRes = await fetch(containerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: payload.caption,
          access_token: tokens.accessToken,
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const containerData = (await containerRes.json()) as any;
      if (!containerRes.ok || containerData.error) {
        throw new Error(containerData.error?.message || "Instagram media creation failed");
      }

      // 2. Publish media container
      const publishUrl = `https://graph.facebook.com/v19.0/${account.platformAccountId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: tokens.accessToken,
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const publishData = (await publishRes.json()) as any;
      if (!publishRes.ok || publishData.error) {
        throw new Error(publishData.error?.message || "Instagram media publish failed");
      }

      return {
        success: true,
        postId: publishData.id || `ig_post_${Date.now()}`,
        platform: "Instagram",
        status: "published",
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      throw new PublishFailedError(err instanceof Error ? err.message : "Meta publishing failed", err);
    }
  }
}
