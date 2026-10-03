import type { MediaItem } from "../../types/media";
import { authenticatedFetch } from "../apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const mediaApi = {
  getMedia: async (): Promise<MediaItem[]> => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/media`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return data.map((item: { id: string; name: string; url: string; type: "image" | "video"; size: number; createdAt: string }) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        type: item.type,
        size: item.size || 1024 * 1024,
        createdAt: item.createdAt || new Date().toISOString(),
      }));
    } catch (err) {
      console.warn("mediaApi.getMedia warning:", err);
      return [];
    }
  },

  uploadMedia: async (file: File): Promise<MediaItem | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await authenticatedFetch(`${API_BASE_URL}/media/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = `Upload failed ${res.status}`;
        try {
           const errData = await res.json();
           if (errData && errData.error) errorMsg = errData.error;
           if (errData && errData.message) errorMsg = errData.message;
        } catch(e) {}
        throw new Error(errorMsg);
      }
      const json = await res.json();
      const item = json.data;

      return {
        id: item.id,
        name: item.name,
        url: item.url,
        type: item.type,
        size: item.size || file.size,
        createdAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("mediaApi.uploadMedia error:", err);
      throw err;
    }
  },

  deleteMedia: async (id: string): Promise<boolean> => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/media/${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
