import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CalendarDays,
  Check,
  ChevronDown,
  FileVideo,
  Hash,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";
import { postStorage } from "../services/postStorage";
import { schedulingApi } from "../services/scheduling/schedulingApi";
import { mediaApi } from "../services/media/mediaApi";
import { socialApi } from "../services/social/socialApi";
import type { PublisherPost, Platform as PostPlatform } from "../types/post";

type MediaItem = {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
};

type Platform = {
  id: string;
  name: string;
  username: string;
  icon: React.ElementType;
  connected: boolean;
  captionLimit: number;
};

type SavedDraft = {
  caption: string;
  selectedPlatforms: string[];
  platformCaptions: Record<string, string>;
  scheduleDate: string;
  scheduleTime: string;
  showSchedule: boolean;
  mediaItems: {
    id: string;
    name: string;
    type: "image" | "video";
  }[];
};

import type { MediaItem as LibraryMediaItem } from "../types/media";

export interface NavigationState {
  source?: string;
  initialCaption?: string;
  selectedPlatform?: PostPlatform;
  mediaItems?: LibraryMediaItem[];
}

const platforms: Platform[] = [
  {
    id: "Instagram",
    name: "Instagram",
    username: "@creator_rb",
    icon: FaInstagram,
    connected: true,
    captionLimit: 2200,
  },
  {
    id: "Facebook",
    name: "Facebook",
    username: "RB Creator",
    icon: FaFacebook,
    connected: false,
    captionLimit: 63206,
  },
  {
    id: "TikTok",
    name: "TikTok",
    username: "@rbcreator",
    icon: FaTiktok,
    connected: false,
    captionLimit: 4000,
  },
  {
    id: "YouTube",
    name: "YouTube",
    username: "RB Creator",
    icon: FaYoutube,
    connected: true,
    captionLimit: 5000,
  },
];

const DRAFT_KEY = "social-publisher-create-post-draft";
const MAX_MEDIA_FILES = 10;
const MAX_MEDIA_SIZE = 100 * 1024 * 1024;

export default function CreatePost() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [caption, setCaption] = useState("");

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [activePreview, setActivePreview] = useState("Instagram");
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [platformCaptions, setPlatformCaptions] = useState<
    Record<string, string>
  >({});
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    socialApi.getConnectedAccounts().then((accs) => {
      if (mounted) {
        const connectedIds = accs.filter(a => a.status === "connected").map(a => a.platform);
        setConnectedPlatforms(connectedIds);
        if (!selectedPlatforms.length) {
            setSelectedPlatforms(connectedIds);
        }
        setIsLoadingAccounts(false);
      }
    }).catch(() => {
      if (mounted) setIsLoadingAccounts(false);
    });
    return () => { mounted = false; };
  }, []);

  const dynamicPlatforms = platforms.map(p => ({
    ...p,
    connected: connectedPlatforms.includes(p.id)
  }));
  const connectedAccounts = dynamicPlatforms.filter((platform) => platform.connected);


const location = useLocation();
const stateImportedRef = useRef(false);

  useEffect(() => {
    if (stateImportedRef.current) return;

    const state = location.state as NavigationState | null;
    let skipDraft = false;

    if (state?.source === "ai-tools" && state.initialCaption) {
      setCaption(state.initialCaption);
      if (state.selectedPlatform) {
        setSelectedPlatforms([state.selectedPlatform]);
        setActivePreview(state.selectedPlatform);
      }
      setStatusType("info");
      setStatusMessage("Content imported from AI Tools");
      skipDraft = true;
    }

    if (state?.source === "media-library" && state.mediaItems) {
      const incomingMedia = state.mediaItems.map(item => ({
        id: item.id,
        file: new File([], item.name, { type: item.type === "video" ? "video/mp4" : "image/jpeg" }),
        preview: item.url,
        type: item.type as "image" | "video",
      }));
      setMediaItems(incomingMedia);
      setStatusType("success");
      setStatusMessage(`Imported ${state.mediaItems.length} media item(s) from Library.`);
    }

    if (!skipDraft) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);

        if (saved) {
          const draft = JSON.parse(saved) as SavedDraft;

          setCaption(draft.caption ?? "");
          setSelectedPlatforms(
            draft.selectedPlatforms?.length
              ? draft.selectedPlatforms
              : [],
          );

          setPlatformCaptions(draft.platformCaptions ?? {});
          setScheduleDate(draft.scheduleDate ?? "");
          setScheduleTime(draft.scheduleTime ?? "");
          setShowSchedule(Boolean(draft.showSchedule));

          const firstSelected = draft.selectedPlatforms?.[0];
          if (firstSelected) {
            setActivePreview(firstSelected);
          }

          if (
            draft.caption ||
            draft.selectedPlatforms?.length ||
            draft.platformCaptions
          ) {
            if (state?.source !== "media-library") {
              setStatusType("info");
              setStatusMessage(
                "Draft text restored. Media files need to be selected again.",
              );
            }
          }
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    
    stateImportedRef.current = true;
  }, [location.state]);

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [mediaItems]);

  const showStatus = (
    message: string,
    type: "success" | "error" | "info",
  ) => {
    setStatusType(type);
    setStatusMessage(message);
  };

  const addMediaFiles = (files: FileList | File[]) => {
    const incomingFiles = Array.from(files);

    if (!incomingFiles.length) return;

    const remainingSlots = MAX_MEDIA_FILES - mediaItems.length;

    if (remainingSlots <= 0) {
      showStatus(`You can add up to ${MAX_MEDIA_FILES} media files.`, "error");
      return;
    }

    const accepted: MediaItem[] = [];
    const rejected: string[] = [];

    for (const file of incomingFiles.slice(0, remainingSlots)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        rejected.push(`${file.name}: unsupported file type`);
        continue;
      }

      if (file.size > MAX_MEDIA_SIZE) {
        rejected.push(`${file.name}: larger than 100 MB`);
        continue;
      }

      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
      });
    }

    if (accepted.length) {
      setMediaItems((current) => [...current, ...accepted]);
      setActiveMediaIndex(mediaItems.length);
    }

    if (rejected.length) {
      showStatus(
        `Some files were skipped: ${rejected.slice(0, 2).join(", ")}${
          rejected.length > 2 ? "..." : ""
        }`,
        "error",
      );
    } else {
      setStatusMessage("");
    }

    if (incomingFiles.length > remainingSlots) {
      showStatus(
        `Only ${remainingSlots} additional media file${
          remainingSlots === 1 ? "" : "s"
        } could be added.`,
        "error",
      );
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addMediaFiles(event.target.files);
    }

    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files) {
      addMediaFiles(event.dataTransfer.files);
    }
  };

  const removeMedia = (mediaId: string) => {
    setMediaItems((current) => {
      const index = current.findIndex((item) => item.id === mediaId);

      if (index === -1) return current;

      URL.revokeObjectURL(current[index].preview);

      const next = current.filter((item) => item.id !== mediaId);

      setActiveMediaIndex((currentIndex) => {
        if (!next.length) return 0;
        if (currentIndex > index) return currentIndex - 1;
        return Math.min(currentIndex, next.length - 1);
      });

      return next;
    });
  };

  const clearAllMedia = () => {
    mediaItems.forEach((item) => URL.revokeObjectURL(item.preview));
    setMediaItems([]);
    setActiveMediaIndex(0);
  };

  const togglePlatform = (platformId: string) => {
    const platform = dynamicPlatforms.find((p) => p.id === platformId);
    if (platform && !platform.connected) {

      showStatus(`Account not connected! Please connect ${platform.name} first in the Accounts page.`, "error");
      return;
    }

    setSelectedPlatforms((current) => {
      const next = current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId];

      if (next.length > 0 && !next.includes(activePreview)) {
        setActivePreview(next[0]);
      }

      return next;
    });
  };

  const updatePlatformCaption = (platformId: string, value: string) => {
    setPlatformCaptions((current) => ({
      ...current,
      [platformId]: value,
    }));
  };

  const getCaptionForPlatform = (platformId: string) =>
    platformCaptions[platformId] ?? caption;

  const selectedCount = selectedPlatforms.length;

  const activePlatform =
    dynamicPlatforms.find((platform) => platform.id === activePreview && selectedPlatforms.includes(platform.id)) ??
    dynamicPlatforms.find((platform) => selectedPlatforms.includes(platform.id)) ??
    dynamicPlatforms[0];


  const activeCaption = getCaptionForPlatform(activePlatform.id);
  const activeCaptionLimit = activePlatform.captionLimit;
  const activeMedia = mediaItems[activeMediaIndex] ?? null;

  const hasOverLimitCaption = selectedPlatforms.some((platformId) => {
    const platform = dynamicPlatforms.find((item) => item.id === platformId);
    if (!platform) return false;


    return getCaptionForPlatform(platformId).length > platform.captionLimit;
  });

  const isScheduleValid = () => {
    if (!showSchedule) return true;
    if (!scheduleDate || !scheduleTime) return false;

    const selectedDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    return (
      !Number.isNaN(selectedDateTime.getTime()) &&
      selectedDateTime.getTime() > Date.now()
    );
  };

  const canSubmit =
    selectedCount > 0 &&
    mediaItems.length > 0 &&
    Boolean(caption.trim()) &&
    !hasOverLimitCaption &&
    isScheduleValid();

  const handleSaveDraft = () => {
    if (!selectedCount) {
      showStatus("Select at least one account to save a draft.", "error");
      return;
    }

    if (!caption.trim()) {
      showStatus("Add a caption before saving a draft.", "error");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    window.setTimeout(() => {
      setIsSaving(false);

      try {
        const selectedPlatformDetails = dynamicPlatforms.filter((platform) =>
          selectedPlatforms.includes(platform.id),
        );

        const newDrafts: PublisherPost[] = selectedPlatformDetails.map((platform) => {

          const platformCaption = getCaptionForPlatform(platform.id);
          return {
            id: `draft-${Date.now()}-${platform.id}`,
            title: platformCaption.trim().length > 45
                ? `${platformCaption.trim().slice(0, 45)}...`
                : platformCaption.trim(),
            caption: platformCaption,
            date: new Date().toISOString().split("T")[0],
            platform: platform.id as PostPlatform,
            status: "Draft",
            mediaType: mediaItems[0]?.type === "video" ? "Video" : "Image",
            thumbnail: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
            createdAt: Date.now(),
          };
        });

        postStorage.savePosts(newDrafts);
        localStorage.removeItem(DRAFT_KEY);

        resetComposer();
        showStatus("Draft saved to shared storage.", "success");
      } catch {
        showStatus("Could not save draft.", "error");
      }
    }, 500);
  };

  const resetComposer = () => {
    mediaItems.forEach((item) => URL.revokeObjectURL(item.preview));
    setMediaItems([]);
    setActiveMediaIndex(0);
    setCaption("");
    setSelectedPlatforms(connectedPlatforms);
    setPlatformCaptions({});

    setScheduleDate("");
    setScheduleTime("");
    setShowSchedule(false);
    setActivePreview("Instagram");
  };

  const handlePublish = () => {
  if (!selectedCount) {
    showStatus("Select at least one account.", "error");
    return;
  }

  if (!mediaItems.length) {
    showStatus("Add at least one media file before publishing.", "error");
    return;
  }

  if (!caption.trim()) {
    showStatus("Add a caption before publishing.", "error");
    return;
  }

  if (hasOverLimitCaption) {
    showStatus(
      "One or more platform captions exceed their limits.",
      "error",
    );
    return;
  }

  if (!isScheduleValid()) {
    showStatus(
      "Choose a future date and time for the scheduled post.",
      "error",
    );
    return;
  }

  if (selectedPlatforms.includes("YouTube") || selectedPlatforms.includes("youtube")) {
    const hasVideo = mediaItems.some(item => item.type === "video");
    if (!hasVideo) {
      showStatus("YouTube requires a video file. Please upload a video.", "error");
      return;
    }
  }

  setIsPublishing(true);
  setStatusMessage("");

  (async () => {
    try {
      // Upload any local files first
      const finalMediaUrls: string[] = [];
      for (const item of mediaItems) {
        if (item.preview.startsWith("blob:")) {
          showStatus(`Uploading ${item.file.name}...`, "info");
          const uploaded = await mediaApi.uploadMedia(item.file);
          if (uploaded && uploaded.url) {
            let finalUrl = uploaded.url;
            if (item.type === "video" && !finalUrl.match(/\.(mp4|webm|mov)(\?|$)/i)) {
              // Force Cloudinary to serve MP4 to ensure YouTube accepts the video format
              finalUrl = finalUrl.split("?")[0] + ".mp4" + (finalUrl.includes("?") ? "?" + finalUrl.split("?")[1] : "");
            }
            finalMediaUrls.push(finalUrl);
          } else {
            throw new Error(`Failed to upload ${item.file.name}`);
          }
        } else {
          finalMediaUrls.push(item.preview);
        }
      }

      showStatus("Publishing...", "info");

      // Trigger backend background publishing / scheduling service
      await schedulingApi.schedulePost({
        caption: caption.trim(),
        platforms: selectedPlatforms as PostPlatform[],
        scheduleDate: showSchedule ? scheduleDate : undefined,
        scheduleTime: showSchedule ? scheduleTime : undefined,
        publishNow: !showSchedule,
        mediaUrls: finalMediaUrls,
      });

      localStorage.removeItem(DRAFT_KEY);

      const message = showSchedule
        ? "Post scheduled successfully with background queue."
        : "Publishing job queued successfully across selected platforms.";

      resetComposer();
      showStatus(message, "success");
    } catch (err: any) {
      console.error("CreatePost handlePublish error:", err);
      showStatus(
        err?.message || "Post could not be published. Please try again.",
        "error",
      );
    } finally {
      setIsPublishing(false);
    }
  })();
};

  const insertHashtag = () => {
    setCaption((current) => {
      const spacer = current && !current.endsWith(" ") ? " " : "";
      return `${current}${spacer}#`;
    });
  };

  const moveMedia = (direction: "left" | "right") => {
    setMediaItems((current) => {
      const from = activeMediaIndex;
      const to = direction === "left" ? from - 1 : from + 1;

      if (to < 0 || to >= current.length) return current;

      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];

      setActiveMediaIndex(to);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-[1400px] pb-6">
      {isLoadingAccounts ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : connectedAccounts.length === 0 ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
            <Link2 size={32} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">No Connected Accounts</h2>
          <p className="mt-2 text-slate-500">You need to connect at least one social media account to create a post.</p>
          <a href="/accounts" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition">
            Go to Accounts
          </a>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-600">Content Composer</p>

        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Create Post
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create once and publish across multiple social platforms.
            </p>
          </div>

          <div className="hidden items-center gap-2 xl:flex">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPublishing ? (
                <Loader2 size={17} className="animate-spin" />
              ) : showSchedule ? (
                <CalendarDays size={17} />
              ) : (
                <Send size={17} />
              )}
              {showSchedule ? "Schedule" : "Publish"}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-xs font-medium ${
              statusType === "error"
                ? "border-red-100 bg-red-50 text-red-700"
                : statusType === "success"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-blue-100 bg-blue-50 text-blue-700"
            }`}
          >
            {statusMessage}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left */}
        <div className="space-y-6">
          {/* Media Library / Multi Media */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Media Library
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Add up to {MAX_MEDIA_FILES} images or videos. Maximum 100 MB
                  per file.
                </p>
              </div>

              {mediaItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllMedia}
                  className="flex w-fit items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600"
                >
                  <Trash2 size={14} />
                  Clear all
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition sm:p-10 ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
              }`}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Upload size={22} />
              </div>

              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                Drag & drop media here
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                or click to browse multiple files
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <FileVideo size={13} />
                  Video
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ImageIcon size={13} />
                  Image
                </span>
              </div>
            </div>

            {mediaItems.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {mediaItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveMediaIndex(index)}
                      className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-slate-100 ${
                        index === activeMediaIndex
                          ? "border-blue-500"
                          : "border-slate-200"
                      }`}
                    >
                      {item.type === "video" ? (
                        <video
                          src={item.preview}
                          muted
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="h-full w-full object-cover"
                        />
                      )}

                      <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {index + 1}
                      </span>

                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          removeMedia(item.id);
                        }}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <X size={13} />
                      </span>
                    </button>
                  ))}
                </div>

                {activeMedia && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="relative aspect-video bg-slate-950">
                      {activeMedia.type === "video" ? (
                        <video
                          src={activeMedia.preview}
                          controls
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <img
                          src={activeMedia.preview}
                          alt="Selected media"
                          className="h-full w-full object-contain"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => removeMedia(activeMedia.id)}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                        aria-label="Remove selected media"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {activeMedia.file.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {activeMedia.type === "video" ? "Video" : "Image"} •{" "}
                          {(activeMedia.file.size / (1024 * 1024)).toFixed(2)}{" "}
                          MB
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveMedia("left")}
                          disabled={activeMediaIndex === 0}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 disabled:opacity-40"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMedia("right")}
                          disabled={activeMediaIndex === mediaItems.length - 1}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 disabled:opacity-40"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMedia(activeMedia.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Caption */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Caption</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Write your main caption. Customize it per platform below.
                </p>
              </div>

              <button
                type="button"
                onClick={insertHashtag}
                className="flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Hash size={14} />
                Add Hashtag
              </button>
            </div>

            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write something about your post..."
              rows={7}
              maxLength={5000}
              className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>Add hashtags, mentions and links to your caption.</span>
              <span>{caption.length}/5000</span>
            </div>
          </section>

          {/* Platform Content */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-semibold text-slate-900">
                Platform Content
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Customize captions and publishing format for each platform.
              </p>
            </div>

            {selectedCount > 0 ? (
              <>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {platforms
                    .filter((platform) =>
                      selectedPlatforms.includes(platform.id),
                    )
                    .map((platform) => {
                      const Icon = platform.icon;
                      const isActive = activePreview === platform.id;

                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => setActivePreview(platform.id)}
                          className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                            isActive
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon size={15} />
                          {platform.name}
                        </button>
                      );
                    })}
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <activePlatform.icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {activePlatform.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {activePlatform.username}
                      </p>
                    </div>

                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <Check size={14} />
                      Ready
                    </span>
                  </div>

                  <textarea
                    value={activeCaption}
                    onChange={(event) =>
                      updatePlatformCaption(
                        activePlatform.id,
                        event.target.value,
                      )
                    }
                    maxLength={activeCaptionLimit}
                    rows={5}
                    className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder={`Customize your ${activePlatform.name} caption...`}
                  />

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Limit: {activeCaptionLimit.toLocaleString()} characters
                    </span>
                    <span>
                      {activeCaption.length}/{activeCaptionLimit}
                    </span>
                  </div>

                  {/* Platform-specific options */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
                    >
                      <span>
                        <span className="block text-xs font-semibold text-slate-700">
                          Content Format
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {activeMedia?.type === "video"
                            ? "Vertical video"
                            : "Image / feed post"}
                        </span>
                      </span>
                      <ChevronDown size={15} className="text-slate-400" />
                    </button>

                    <button
                      type="button"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
                    >
                      <span>
                        <span className="block text-xs font-semibold text-slate-700">
                          Publishing Mode
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {showSchedule ? "Scheduled" : "Publish now"}
                        </span>
                      </span>
                      <ChevronDown size={15} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No platform selected
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Select at least one account from the right side.
                </p>
              </div>
            )}
          </section>

          {/* Preview */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-blue-600" />
              <div>
                <h2 className="font-semibold text-slate-900">Post Preview</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Preview your selected platform content.
                </p>
              </div>
            </div>

            <div className="mx-auto mt-5 max-w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <activePlatform.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {activePlatform.username}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {activePlatform.name}
                  </p>
                </div>
              </div>

              <div className="aspect-square bg-slate-100">
                {activeMedia ? (
                  activeMedia.type === "video" ? (
                    <video
                      src={activeMedia.preview}
                      muted
                      controls
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <img
                      src={activeMedia.preview}
                      alt="Post preview"
                      className="h-full w-full object-contain"
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <ImageIcon
                        size={30}
                        className="mx-auto text-slate-300"
                      />
                      <p className="mt-2 text-xs text-slate-400">
                        Media preview will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {mediaItems.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 border-b border-slate-100 p-3">
                  {mediaItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveMediaIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeMediaIndex
                          ? "w-5 bg-blue-600"
                          : "w-1.5 bg-slate-300"
                      }`}
                      aria-label={`Preview media ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {activeCaption || "Your caption will appear here..."}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right */}
        <aside className="space-y-6">
          {/* Publish To */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Publish To</h2>
              <p className="mt-1 text-xs text-slate-500">
                Select the accounts where you want to publish.
              </p>
            </div>

            <div className="p-4">
              <div className="space-y-2">
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  const selected = selectedPlatforms.includes(platform.id);

                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-blue-200 bg-blue-50/60"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                        <Icon size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {platform.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {platform.connected ? platform.username : "Not Connected"}
                        </p>
                      </div>

                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selected && <Check size={13} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  showStatus(
                    "Account connection UI will be added in the Accounts phase.",
                    "info",
                  )
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              >
                <Plus size={15} />
                Connect another account
              </button>
            </div>
          </section>

          {/* Publish Options */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Publish Options</h2>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowSchedule(false);
                  setStatusMessage("");
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  !showSchedule
                    ? "border-blue-200 bg-blue-50/60"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                  <Send size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Publish Now
                  </p>
                  <p className="text-xs text-slate-400">
                    Publish immediately
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSchedule(true);
                  setStatusMessage("");
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  showSchedule
                    ? "border-blue-200 bg-blue-50/60"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                  <CalendarDays size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Schedule
                  </p>
                  <p className="text-xs text-slate-400">
                    Choose future date and time
                  </p>
                </div>
              </button>
            </div>

            {showSchedule && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="schedule-date"
                      className="mb-1.5 block text-xs font-medium text-slate-600"
                    >
                      Date
                    </label>
                    <input
                      id="schedule-date"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={scheduleDate}
                      onChange={(event) => setScheduleDate(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="schedule-time"
                      className="mb-1.5 block text-xs font-medium text-slate-600"
                    >
                      Time
                    </label>
                    <input
                      id="schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {scheduleDate &&
                  scheduleTime &&
                  !isScheduleValid() && (
                    <p className="mt-2 text-[11px] font-medium text-red-500">
                      Schedule time must be in the future.
                    </p>
                  )}
              </div>
            )}
          </section>

          {/* Summary */}
          <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex items-center gap-2">
              <Link2 size={17} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Publishing Summary
              </h2>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Media</span>
                <span className="font-medium text-slate-800">
                  {mediaItems.length
                    ? `${mediaItems.length} file${
                        mediaItems.length === 1 ? "" : "s"
                      }`
                    : "Not selected"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Accounts</span>
                <span className="font-medium text-slate-800">
                  {selectedCount} selected
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Caption</span>
                <span className="font-medium text-slate-800">
                  {caption.trim() ? "Added" : "Empty"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Validation</span>
                <span
                  className={`font-medium ${
                    canSubmit ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {canSubmit ? "Ready" : "Needs attention"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Action</span>
                <span className="font-medium text-blue-600">
                  {showSchedule ? "Scheduled" : "Publish Now"}
                </span>
              </div>
            </div>

            {!canSubmit && (
              <p className="mt-4 text-[11px] leading-5 text-slate-500">
                Add media, caption and at least one account
                {hasOverLimitCaption ? ". Fix caption limits" : ""}
                {showSchedule ? ", then choose a future date and time" : ""}.
              </p>
            )}
          </section>
        </aside>
      </div>

      {/* Mobile Actions */}
      <div className="mt-6 flex gap-3 xl:hidden">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={17} className="animate-spin" /> : null}
          {isSaving ? "Saving..." : "Save Draft"}
        </button>

        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPublishing ? (
            <Loader2 size={17} className="animate-spin" />
          ) : showSchedule ? (
            <CalendarDays size={17} />
          ) : (
            <Send size={17} />
          )}
          {showSchedule ? "Schedule" : "Publish"}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
