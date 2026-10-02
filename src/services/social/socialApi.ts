import type { ConnectedSocialAccount, SocialPlatform } from "../../types/social";
import { authenticatedFetch, getAuthHeaders } from "../apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface ProviderStatusInfo {
  platform: SocialPlatform;
  configured: boolean;
  missingEnvVars: string[];
}

export const socialApi = {
  /**
   * Fetches backend integration configuration status for each provider.
   */
  getAuthStatus: async (): Promise<ProviderStatusInfo[]> => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/auth/status`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetches all connected accounts for the user's workspace securely.
   */
  getConnectedAccounts: async (): Promise<ConnectedSocialAccount[]> => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/accounts`, {
        headers: {
          'Accept': 'application/json'
        },
      });
      
      if (!response.ok) {
        // Fallback to legacy endpoint if needed
        const legacyRes = await authenticatedFetch(`${API_BASE_URL}/social/accounts`);
        if (!legacyRes.ok) {
          throw new Error(`Failed to fetch accounts: ${response.statusText}`);
        }
        return await legacyRes.json();
      }
      
      return await response.json();
    } catch (error) {
      console.warn("socialApi.getConnectedAccounts Network Warning:", error);
      return [];
    }
  },

  /**
   * Redirects the user browser to the backend to start real OAuth flow.
   */
  connectAccount: async (platform: SocialPlatform) => {
    const authHeaders = await getAuthHeaders();
    const userId = authHeaders["x-user-id"] || "";
    const workspaceId = authHeaders["x-workspace-id"] || "";
    window.location.href = `${API_BASE_URL}/auth/${platform.toLowerCase()}?userId=${encodeURIComponent(userId)}&workspaceId=${encodeURIComponent(workspaceId)}`;
  },

  /**
   * Requests the backend to disconnect and delete the social account.
   */
  disconnectAccount: async (accountId: string): Promise<boolean> => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/accounts/${accountId}/disconnect`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to disconnect: ${response.statusText}`);
      }
      return true;
    } catch (error) {
      console.error("socialApi.disconnectAccount Error:", error);
      throw error;
    }
  },

  /**
   * Requests the backend to refresh account tokens.
   */
  refreshAccount: async (accountId: string): Promise<boolean> => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/accounts/${accountId}/refresh`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.statusText}`);
      }
      return true;
    } catch (error) {
      console.error("socialApi.refreshAccount Error:", error);
      throw error;
    }
  }
};
