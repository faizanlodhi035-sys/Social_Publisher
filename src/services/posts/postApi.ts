import type { PublisherPost } from "../../types/post";
import { authenticatedFetch } from "../apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const postApi = {
  getPosts: async (): Promise<PublisherPost[]> => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/posts`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("postApi.getPosts warning:", err);
      return [];
    }
  },

  createPost: async (post: Partial<PublisherPost>): Promise<PublisherPost | null> => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });
      if (!res.ok) throw new Error(`Create post failed ${res.status}`);
      const json = await res.json();
      return json.data;
    } catch (err) {
      console.error("postApi.createPost error:", err);
      return null;
    }
  },

  deletePost: async (id: string): Promise<boolean> => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/posts/${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
