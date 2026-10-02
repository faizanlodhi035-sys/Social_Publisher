export type MediaType = "image" | "video";

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  size: number;
  createdAt: string;
}

export type MediaFilter = "all" | "image" | "video";
