import { accountRepository } from "../repositories/accountRepository.js";
import { getProviderForPlatform } from "../providers/index.js";
import type { AccountTokens, StoredAccountRecord } from "../types/index.js";

export class TokenService {
  /**
   * Ensures that the account has a valid access token.
   * If the access token is expired (or expires within 5 minutes) and a refresh token is present,
   * it automatically executes the provider refresh token flow and updates the backend repository.
   */
  public async ensureValidToken(account: StoredAccountRecord): Promise<AccountTokens> {
    const { tokens } = account;
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer

    const isExpired = tokens.expiresAt && Date.now() + bufferMs >= tokens.expiresAt;

    if (!isExpired) {
      return tokens;
    }

    // Token is near expiry or expired
    if (!tokens.refreshToken) {
      // Cannot refresh, mark account as needing attention
      await accountRepository.updateAccountStatus(account.id, "needs_attention");
      throw new Error(`Token expired for ${account.platform} account '${account.displayName}'. Please reconnect.`);
    }

    try {
      const provider = getProviderForPlatform(account.platform);
      const newTokens = await provider.refreshAccessToken(tokens.refreshToken);

      await accountRepository.updateAccountTokens(account.id, newTokens, "connected");
      return newTokens;
    } catch (err) {
      await accountRepository.updateAccountStatus(account.id, "needs_attention");
      throw new Error(`Token refresh failed for ${account.platform}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
}

export const tokenService = new TokenService();
