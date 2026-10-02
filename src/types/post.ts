export type Platform = "Instagram" | "Facebook" | "TikTok" | "YouTube";

export type PostStatus = "Draft" | "Scheduled" | "Published" | "Failed" | "Publishing" | "Cancelled";

export interface PublisherPost {
  id: string;
  title: string;
  caption: string;
  status: PostStatus;
  platform: Platform;
  date: string; // YYYY-MM-DD format for easy sorting and calendar integration
  time?: string;
  mediaType?: "Image" | "Video";
  thumbnail?: string; // Fallback image URL for demo purposes
  platformCaptions?: Record<string, string>;
  createdAt: number;
}
