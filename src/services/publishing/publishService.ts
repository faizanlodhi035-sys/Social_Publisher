import type { PublishRequest, PublishResponse } from "../../types/social";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const publishService = {
  /**
   * Submits a post to the backend for processing and actual API publishing.
   */
  publishPost: async (request: PublishRequest): Promise<PublishResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(request)
      });
      
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error?.message || data.error || `Publish failed with status ${response.statusText}`;
        throw new Error(errorMsg);
      }
      
      return {
        success: true,
        postId: data.postId || data.data?.postId,
      };
    } catch (error) {
      console.error("publishService.publishPost Error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Backend connection failed. Cannot publish post."
      );
    }
  }
};
