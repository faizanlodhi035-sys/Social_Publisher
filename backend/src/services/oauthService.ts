import { getProviderForPlatform, getAllProviders } from "../providers/index.js";
import { accountRepository } from "../repositories/accountRepository.js";
import type { ConnectedAccount, ProviderAuthStatus, SocialPlatform } from "../types/index.js";
import { generateStateToken, verifyStateToken } from "../utils/crypto.js";
import { OAuthCallbackError, OAuthStateError, ProviderNotConfiguredError } from "../utils/errors.js";

export class OAuthService {
  /**
   * Returns integration configuration status for all supported social platforms.
   */
  public getAuthStatus(): ProviderAuthStatus[] {
    return getAllProviders().map((provider) => ({
      platform: provider.platform,
      configured: provider.isConfigured(),
      missingEnvVars: provider.getMissingEnvVars(),
    }));
  }

  /**
   * Generates authorization URL for the requested platform and returns state token.
   */
  public initiateOAuth(platform: SocialPlatform, workspaceId = "default-workspace"): { url: string; stateToken: string } {
    const provider = getProviderForPlatform(platform);

    if (!provider.isConfigured()) {
      throw new ProviderNotConfiguredError(platform);
    }

    const stateToken = generateStateToken(platform, workspaceId);
    const url = provider.getAuthorizationUrl(stateToken);

    return { url, stateToken };
  }

  /**
   * Handles OAuth callback from provider.
   * Validates state, exchanges code for tokens, and persists connected accounts to the verified workspace.
   */
  public async handleCallback(
    platform: SocialPlatform,
    code: string,
    state: string
  ): Promise<ConnectedAccount[]> {
    const stateResult = verifyStateToken(state, platform);
    if (!stateResult.valid) {
      throw new OAuthStateError(`OAuth state token validation failed for platform '${platform}'.`);
    }

    const workspaceId = stateResult.workspaceId || "default-workspace";
    const provider = getProviderForPlatform(platform);
    if (!provider.isConfigured()) {
      throw new ProviderNotConfiguredError(platform);
    }

    const { tokens, accounts } = await provider.exchangeCodeForTokens(code);

    if (!accounts || accounts.length === 0) {
      throw new OAuthCallbackError(`No accounts found or authorized for ${platform}`);
    }

    const savedAccounts: ConnectedAccount[] = [];

    for (const acc of accounts) {
      const saved = await accountRepository.saveAccount(
        {
          platform: acc.platform,
          platformAccountId: acc.platformAccountId,
          username: acc.username,
          displayName: acc.displayName,
          avatarUrl: acc.avatarUrl,
          capabilities: acc.capabilities,
        },
        tokens,
        workspaceId
      );
      savedAccounts.push(saved);
    }

    return savedAccounts;
  }
}

export const oauthService = new OAuthService();
