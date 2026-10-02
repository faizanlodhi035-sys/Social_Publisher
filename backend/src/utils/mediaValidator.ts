import { AppError } from "./errors.js";

export interface MediaValidationRules {
  maxSizeBytes?: number; // default 100MB
  allowedTypes?: Array<"image" | "video">;
  allowedExtensions?: string[];
}

const DEFAULT_IMAGE_MAX = 15 * 1024 * 1024; // 15MB
const DEFAULT_VIDEO_MAX = 100 * 1024 * 1024; // 100MB

export class MediaValidator {
  public static validateMediaUrl(url: string, type: "image" | "video" = "image"): void {
    if (!url || typeof url !== "string") {
      throw new AppError("Media URL is required.", 400, "INVALID_MEDIA");
    }

    // Ensure URL is valid HTTPS or Data URI
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:")) {
      throw new AppError("Media URL must use http, https, or data URI format.", 400, "INVALID_MEDIA_URL");
    }

    const cleanUrl = url.split("?")[0].toLowerCase();
    if (type === "image") {
      const validExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
      const isDataImage = url.startsWith("data:image/");
      const isValidExt = validExts.some((ext) => cleanUrl.endsWith(ext));
      if (!isDataImage && !isValidExt && !url.includes("unsplash.com") && !url.includes("firebasestorage.googleapis.com")) {
        console.warn("[MediaValidator] Non-standard image extension, allowing with warning:", url);
      }
    } else if (type === "video") {
      const validExts = [".mp4", ".mov", ".webm", ".m4v"];
      const isDataVideo = url.startsWith("data:video/");
      const isValidExt = validExts.some((ext) => cleanUrl.endsWith(ext));
      if (!isDataVideo && !isValidExt && !url.includes("firebasestorage.googleapis.com")) {
        console.warn("[MediaValidator] Non-standard video extension, allowing with warning:", url);
      }
    }
  }

  public static validateMediaSize(sizeBytes: number, type: "image" | "video"): void {
    const maxLimit = type === "video" ? DEFAULT_VIDEO_MAX : DEFAULT_IMAGE_MAX;
    if (sizeBytes > maxLimit) {
      const limitMb = Math.round(maxLimit / (1024 * 1024));
      throw new AppError(
        `Media file size (${Math.round(sizeBytes / (1024 * 1024))}MB) exceeds maximum limit of ${limitMb}MB for ${type}.`,
        400,
        "MEDIA_SIZE_EXCEEDED"
      );
    }
  }
}
