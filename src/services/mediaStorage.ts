import type { MediaItem } from "../types/media";

const STORAGE_KEY = "social-publisher-media-library";

// Demo data for initial load
const DEMO_MEDIA: MediaItem[] = [
  {
    id: "demo-img-1",
    name: "workspace_setup.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80",
    size: 1024 * 500, // 500kb
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-img-2",
    name: "content_calendar.png",
    type: "image",
    url: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80",
    size: 1024 * 300,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-vid-1",
    name: "intro_b_roll.mp4",
    type: "video",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    size: 1024 * 1024 * 2.5,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "demo-img-3",
    name: "social_stats.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    size: 1024 * 800,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

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
