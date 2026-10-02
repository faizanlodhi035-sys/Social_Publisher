import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  PlayCircle
} from "lucide-react";
import { mediaStorage } from "../services/mediaStorage";
import { mediaApi } from "../services/media/mediaApi";
import type { MediaItem, MediaFilter } from "../types/media";

const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100 MB

export default function MediaLibrary() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");

  const loadMedia = async () => {
    const backendItems = await mediaApi.getMedia();
    if (backendItems.length > 0) {
      setMediaItems(backendItems);
    } else {
      setMediaItems(mediaStorage.getAllMedia());
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const showStatus = (message: string, type: "success" | "error" | "info") => {
    setStatusType(type);
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newItems: MediaItem[] = [];
    let rejectedCount = 0;

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if ((!isImage && !isVideo) || file.size > MAX_MEDIA_SIZE) {
        rejectedCount++;
        continue;
      }

      // Try uploading to backend / Firebase Storage
      const uploaded = await mediaApi.uploadMedia(file);
      if (uploaded) {
        newItems.push(uploaded);
      } else {
        // Fallback local media item
        const fallbackItem: MediaItem = {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: file.name,
          type: isImage ? "image" : "video",
          url: URL.createObjectURL(file),
          size: file.size,
          createdAt: new Date().toISOString(),
        };
        newItems.push(fallbackItem);
      }
    }

    if (newItems.length > 0) {
      mediaStorage.addMedia(newItems);
      await loadMedia();
      showStatus(`Successfully uploaded ${newItems.length} item(s)`, "success");
    }

    if (rejectedCount > 0) {
      showStatus(`${rejectedCount} file(s) rejected (unsupported type or >100MB)`, "error");
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this media item?")) {
      await mediaApi.deleteMedia(id);
      mediaStorage.deleteMedia(id);
      await loadMedia();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (previewItem?.id === id) {
        setPreviewItem(null);
      }
      showStatus("Media deleted", "success");
    }
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} item(s)?`)) {
      for (const id of selectedIds) {
        await mediaApi.deleteMedia(id);
        mediaStorage.deleteMedia(id);
      }
      await loadMedia();
      setSelectedIds(new Set());
      showStatus("Selected media deleted", "success");
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleUseInCreatePost = () => {
    const selectedItems = mediaItems.filter(m => selectedIds.has(m.id));
    if (selectedItems.length === 0) return;

    navigate("/create-post", {
      state: {
        source: "media-library",
        mediaItems: selectedItems
      }
    });
  };

  const filteredMedia = useMemo(() => {
    return mediaItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === "all" || item.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [mediaItems, searchQuery, filter]);

  const totalImages = mediaItems.filter(m => m.type === "image").length;
  const totalVideos = mediaItems.filter(m => m.type === "video").length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Media Library</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload, organize and manage your images and videos for social publishing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            multiple
            accept="image/*,video/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload Media
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`mb-6 flex items-center justify-between rounded-xl p-4 ${
            statusType === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : statusType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 size={16} />
            {statusMessage}
          </div>
          <button onClick={() => setStatusMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Controls & Summary */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            {(["all", "image", "video"] as MediaFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition ${
                  filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1.5"><ImageIcon size={16} /> {totalImages} Images</div>
          <div className="flex items-center gap-1.5"><FileVideo size={16} /> {totalVideos} Videos</div>
          <div className="font-semibold text-slate-900">{mediaItems.length} Total</div>
        </div>
      </div>

      {/* Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 border border-blue-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <CheckCircle2 size={18} className="text-blue-600" />
            {selectedIds.size} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5"
            >
              Clear
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={14} /> Delete
            </button>
            <button
              onClick={handleUseInCreatePost}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={16} /> Use in Post
            </button>
          </div>
        </div>
      )}

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto pb-12">
        {mediaItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ImageIcon size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No media yet</h3>
            <p className="mt-1 text-sm text-slate-500">Upload your first image or video to start building your media library.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Upload Media
            </button>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold text-slate-900">No matching media</p>
            <p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-slate-100 transition-all hover:border-blue-400 hover:shadow-md ${
                  selectedIds.has(item.id) ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200"
                }`}
              >
                {item.type === "image" ? (
                  <img src={item.url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="relative h-full w-full">
                    <video src={item.url} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle size={32} className="text-white opacity-80" />
                    </div>
                  </div>
                )}
                
                {/* Overlay Controls */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 p-3 flex flex-col justify-between transition-opacity ${
                  selectedIds.has(item.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}>
                  <div className="flex justify-between items-start">
                    <button
                      onClick={(e) => toggleSelect(item.id, e)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        selectedIds.has(item.id)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-black/20 border-white/70 text-transparent hover:bg-black/40"
                      }`}
                    >
                      <Check size={14} />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="rounded bg-black/40 p-1.5 text-white/80 hover:bg-rose-500 hover:text-white"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="w-full">
                    <p className="truncate text-xs font-medium text-white">{item.name}</p>
                    <p className="text-[10px] text-white/70">
                      {item.type.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewItem(null)}>
          <div 
            className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700 p-4">
              <div className="min-w-0 pr-4">
                <h3 className="truncate font-semibold text-white">{previewItem.name}</h3>
                <p className="text-xs text-slate-400">
                  {previewItem.type.toUpperCase()}
                </p>
              </div>
              <button 
                onClick={() => setPreviewItem(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50 min-h-[300px]">
              {previewItem.type === "image" ? (
                <img src={previewItem.url} alt={previewItem.name} className="max-h-[70vh] max-w-full object-contain rounded" />
              ) : (
                <video src={previewItem.url} controls className="max-h-[70vh] max-w-full rounded" />
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-700 p-4 bg-slate-900">
              <button
                onClick={() => {
                  handleDelete(previewItem.id);
                }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-400/10"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  toggleSelect(previewItem.id, { stopPropagation: () => {} } as any);
                  if (!selectedIds.has(previewItem.id)) {
                    showStatus("Added to selection", "success");
                  }
                }}
                className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {selectedIds.has(previewItem.id) ? "Deselect" : "Select"}
              </button>
              <button
                onClick={() => {
                  navigate("/create-post", {
                    state: {
                      source: "media-library",
                      mediaItems: [previewItem]
                    }
                  });
                }}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Use in Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
