import { envConfig } from "../config/env.js";
import type { AccountTokens, PublishRequestPayload, PublishResult, SocialPlatform } from "../types/index.js";
import { OAuthCallbackError, PublishFailedError } from "../utils/errors.js";
import type { AccountInfo, ISocialProvider } from "./baseProvider.js";

export class YouTubeProvider implements ISocialProvider {
  public platform: SocialPlatform = "YouTube";

  public isConfigured(): boolean {
    return Boolean(envConfig.youtube.clientId && envConfig.youtube.clientSecret);
  }

  public getMissingEnvVars(): string[] {
    const missing: string[] = [];
    if (!envConfig.youtube.clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!envConfig.youtube.clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    return missing;
  }

  public getAuthorizationUrl(state: string): string {
    if (envConfig.youtube.clientId.startsWith("demo_")) {
      return `${envConfig.youtube.redirectUri}?code=demo_youtube_code&state=${state}`;
    }

    const scopes = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: envConfig.youtube.clientId,
      redirect_uri: envConfig.youtube.redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public async exchangeCodeForTokens(code: string): Promise<{ tokens: AccountTokens; accounts: AccountInfo[] }> {
    if (!this.isConfigured()) {
      throw new OAuthCallbackError("YouTube/Google OAuth is not configured on the backend server.");
    }

    if (code.startsWith("demo_") || envConfig.youtube.clientId.startsWith("demo_")) {
      return {
        tokens: {
          accessToken: "demo_youtube_access_token_" + Date.now(),
          refreshToken: "demo_youtube_refresh_token_" + Date.now(),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tokenType: "bearer",
        },
        accounts: [
          {
            platformAccountId: "yt_demo_acc_104",
            platform: "YouTube",
            username: "@YouTubeChannel",
            displayName: "Official YouTube Channel",
            avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces",
            capabilities: { publish: true, analytics: true },
          },
        ],
      };
    }

    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: envConfig.youtube.clientId,
          client_secret: envConfig.youtube.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: envConfig.youtube.redirectUri,
        }).toString(),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenData = (await res.json()) as any;

      if (!res.ok || tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error || "Google OAuth token exchange failed");
      }

      const tokens: AccountTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
        tokenType: tokenData.token_type || "Bearer",
        scope: tokenData.scope,
      };

      // Fetch YouTube Channel Info
      let accountInfo: AccountInfo = {
        platformAccountId: `youtube_channel_${Date.now()}`,
        platform: "YouTube",
        username: "YouTube Channel",
        displayName: "YouTube Channel",
        capabilities: { publish: true, analytics: true },
      };

      try {
        const channelRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const channelData = (await channelRes.json()) as any;

        if (channelData.items && channelData.items.length > 0) {
          const ch = channelData.items[0];
          accountInfo = {
            platformAccountId: ch.id,
            platform: "YouTube",
            username: ch.snippet.customUrl || ch.snippet.title,
            displayName: ch.snippet.title,
            avatarUrl: ch.snippet.thumbnails?.default?.url,
            capabilities: { publish: true, analytics: true },
          };
        } else {
          // Fallback to Google Profile if no YouTube channel is created yet
          const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          });
          const userData = (await userRes.json()) as any;
          if (userData && userData.id) {
            accountInfo = {
              platformAccountId: `google_${userData.id}`,
              platform: "YouTube",
              username: userData.email || userData.name || "Google User",
              displayName: userData.name || "Google User",
              avatarUrl: userData.picture,
              capabilities: { publish: true, analytics: true },
            };
          }
        }
      } catch (err) {
        // Fallback to basic account info if channel query fails
        console.warn("[YouTubeProvider] Failed to fetch channel/profile info:", err);
      }

      return { tokens, accounts: [accountInfo] };
    } catch (err) {
      throw new OAuthCallbackError(err instanceof Error ? err.message : "YouTube code exchange failed", err);
    }
  }

  public async refreshAccessToken(refreshToken: string): Promise<AccountTokens> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: envConfig.youtube.clientId,
        client_secret: envConfig.youtube.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    if (!res.ok || data.error) {
      throw new Error(data.error_description || "Failed to refresh Google token");
    }

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Refresh token is retained
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }

  public async publishPost(
    account: { platformAccountId: string; username: string },
    tokens: AccountTokens,
    payload: PublishRequestPayload
  ): Promise<PublishResult> {
    if (!tokens.accessToken) {
      throw new PublishFailedError("Valid access token missing for YouTube.");
    }

    try {
      const mediaUrl = payload.mediaUrls?.[0];
      if (!mediaUrl) {
        throw new Error("YouTube requires a video file to publish.");
      }

      // Fetch the video from the provided media URL
      const mediaRes = await fetch(mediaUrl);
      if (!mediaRes.ok) throw new Error("Failed to download media file for upload.");
      const videoBuffer = await mediaRes.arrayBuffer();

      // YouTube Data API v3 upload request metadata
      const videoMetadata = {
        snippet: {
          title: payload.caption.trim().slice(0, 95) || "New Social Video",
          description: payload.caption,
          tags: ["social", "publisher"],
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      };

      // Resumable upload metadata init
      const initUrl = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
      const initRes = await fetch(initUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify(videoMetadata),
      });

      if (!initRes.ok) {
        const errorText = await initRes.text();
        throw new Error(`YouTube video upload initialization failed: ${errorText}`);
      }

      const uploadUrl = initRes.headers.get("Location");
      if (!uploadUrl) {
        throw new Error("YouTube failed to return a resumable upload URL.");
      }

      // Upload actual video bytes
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": videoBuffer.byteLength.toString(),
          "Content-Type": "video/mp4",
        },
        body: videoBuffer,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`YouTube video upload failed: ${errorText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uploadData = (await uploadRes.json()) as any;
      const videoId = uploadData.id || `yt_vid_${Date.now()}`;

      return {
        success: true,
        postId: videoId,
        platform: "YouTube",
        status: "published",
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      throw new PublishFailedError(err instanceof Error ? err.message : "YouTube video upload failed", err);
    }
  }
}
