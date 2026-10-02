import type { MediaItem } from "../types/media";

const STORAGE_KEY = "social-publisher-media-library";

// Demo data for initial load
const DEMO_MEDIA: MediaItem[] = [];

export const mediaStorage = {
  getAllMedia: (): MediaItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    
    // First time load: save demo media
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_MEDIA));
    return DEMO_MEDIA;
  },

  addMedia: (items: MediaItem[]): void => {
    const current = mediaStorage.getAllMedia();
    const updated = [...items, ...current];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save to localStorage. It may be full.", e);
    }
  },

  deleteMedia: (id: string): void => {
    const current = mediaStorage.getAllMedia();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};
