import type { SocialPlatform } from "../types/index.js";
import type { ISocialProvider } from "./baseProvider.js";
import { MetaProvider } from "./metaProvider.js";
import { TikTokProvider } from "./tiktokProvider.js";
import { YouTubeProvider } from "./youtubeProvider.js";

const metaFbProvider = new MetaProvider("Facebook");
const metaIgProvider = new MetaProvider("Instagram");
const tiktokProvider = new TikTokProvider();
const youtubeProvider = new YouTubeProvider();

export function getProviderForPlatform(platform: SocialPlatform): ISocialProvider {
  const norm = platform.toLowerCase();
  if (norm === "facebook") return metaFbProvider;
  if (norm === "instagram") return metaIgProvider;
  if (norm === "tiktok") return tiktokProvider;
  if (norm === "youtube") return youtubeProvider;

  throw new Error(`Unsupported platform '${platform}'`);
}

export function getAllProviders(): ISocialProvider[] {
  return [metaFbProvider, metaIgProvider, tiktokProvider, youtubeProvider];
}
