import { accountRepository } from "../repositories/accountRepository.js";
import { getProviderForPlatform } from "../providers/index.js";
import { tokenService } from "./tokenService.js";
import type { PublishRequestPayload, PublishResult } from "../types/index.js";
import { AccountNotFoundError, PublishFailedError } from "../utils/errors.js";

export class BackendPublishService {
  /**
   * Publishes a post to the requested social account with workspace authorization.
   */
  public async publish(
    payload: PublishRequestPayload,
    workspaceId = "default-workspace"
  ): Promise<PublishResult> {
    if (!payload.accountId) {
      throw new PublishFailedError("Missing required 'accountId' in publish request.");
    }

    if (!payload.caption || !payload.caption.trim()) {
      throw new PublishFailedError("Post caption cannot be empty.");
    }

    const accountWithTokens = await accountRepository.getAccountWithTokens(payload.accountId, workspaceId);
    if (!accountWithTokens) {
      throw new AccountNotFoundError(payload.accountId);
    }

    if (accountWithTokens.status === "disconnected") {
      throw new PublishFailedError(`Account '${accountWithTokens.displayName}' is disconnected. Please reconnect before publishing.`);
    }

    // 1. Ensure token is valid (auto-refreshes if needed)
    const validTokens = await tokenService.ensureValidToken(accountWithTokens);

    // 2. Call provider publish implementation
    const provider = getProviderForPlatform(accountWithTokens.platform);

    return provider.publishPost(
      {
        platformAccountId: accountWithTokens.platformAccountId,
        username: accountWithTokens.username,
      },
      validTokens,
      payload
    );
  }
}

export const backendPublishService = new BackendPublishService();
