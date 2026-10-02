import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import type { PublisherPost, Platform, PostStatus } from "../types/post";
import { postStorage } from "../services/postStorage";
import { schedulingApi } from "../services/scheduling/schedulingApi";

const statusFilters = ["All", "Draft", "Scheduled", "Publishing", "Published", "Failed", "Cancelled"] as const;

const platformFilters = [
  "All",
  "Instagram",
  "Facebook",
  "TikTok",
  "YouTube",
] as const;

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "Instagram") {
    return <FaInstagram size={17} />;
  }

  if (platform === "Facebook") {
    return <FaFacebook size={17} />;
  }

  if (platform === "TikTok") {
    return <FaTiktok size={17} />;
  }

  return <FaYoutube size={17} />;
}

function StatusBadge({ status }: { status: PostStatus }) {
  const config = {
    Draft: {
      icon: FileText,
      className: "bg-slate-100 text-slate-700",
    },
    Scheduled: {
      icon: Clock3,
      className: "bg-amber-50 text-amber-700",
    },
    Publishing: {
      icon: Loader2,
      className: "bg-blue-50 text-blue-700 animate-pulse",
    },
    Published: {
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700",
    },
    Failed: {
      icon: AlertCircle,
      className: "bg-rose-50 text-rose-700",
    },
    Cancelled: {
      icon: X,
      className: "bg-slate-100 text-slate-500",
    },
  };

  const current = config[status] || config.Draft;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${current.className}`}
    >
      <Icon size={13} className={status === "Publishing" ? "animate-spin" : ""} />
      {status}
    </span>
  );
}

function Content() {
  const navigate = useNavigate();

  const [content, setContent] = useState<PublisherPost[]>([]);
  const [activeStatus, setActiveStatus] =
    useState<(typeof statusFilters)[number]>("All");
  const [activePlatform, setActivePlatform] =
    useState<(typeof platformFilters)[number]>("All");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<PublisherPost | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    const localPosts = postStorage.getAllPosts();
    setContent(localPosts);

    schedulingApi
      .getScheduledPosts()
      .then((serverPosts) => {
        if (Array.isArray(serverPosts) && serverPosts.length > 0) {
          const transformed: PublisherPost[] = serverPosts.flatMap((sp) =>
            sp.platforms.map((plat) => ({
              id: sp.id,
              title: sp.title || sp.caption.slice(0, 45),
              caption: sp.caption,
              date: sp.date,
              time: sp.time || "10:00 AM",
              platform: plat as Platform,
              status: sp.status as PostStatus,
              thumbnail: sp.thumbnail,
              mediaType: sp.mediaType || "Image",
              createdAt: sp.createdAt,
            }))
          );
          const merged = [...localPosts];
          transformed.forEach((tp) => {
            const idx = merged.findIndex((m) => m.id === tp.id && m.platform === tp.platform);
            if (idx >= 0) {
              merged[idx] = tp;
            } else {
              merged.push(tp);
            }
          });
          setContent(merged);
        }
      })
      .catch((err) => console.warn("Could not fetch remote posts:", err));
  }, []);

  const stats = useMemo(() => {
    return {
      all: content.length,
      drafts: content.filter((item) => item.status === "Draft").length,
      scheduled: content.filter((item) => item.status === "Scheduled").length,
      published: content.filter((item) => item.status === "Published").length,
    };
  }, [content]);

  const filteredContent = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return content.filter((item) => {
      const matchesStatus =
        activeStatus === "All" || item.status === activeStatus;

      const matchesPlatform =
        activePlatform === "All" || item.platform === activePlatform;

      const matchesSearch =
        !searchValue ||
        item.title.toLowerCase().includes(searchValue) ||
        item.caption.toLowerCase().includes(searchValue) ||
        item.platform.toLowerCase().includes(searchValue);

      return matchesStatus && matchesPlatform && matchesSearch;
    });
  }, [content, activePlatform, activeStatus, search]);

  const duplicateItem = (item: PublisherPost) => {
    const newItem: PublisherPost = {
      ...item,
      id: `copy-${Date.now()}`,
      title: `${item.title} Copy`,
      status: "Draft",
      date: new Date().toISOString().split("T")[0],
      time: undefined,
      createdAt: Date.now()
    };

    postStorage.savePosts([newItem]);
    setContent(postStorage.getAllPosts());
    setMenuId(null);
  };

  const deleteItem = (id: string) => {
    postStorage.deletePost(id);
    setContent(postStorage.getAllPosts());
    setMenuId(null);
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Content Library
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your drafts, scheduled posts and published content.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/create-post")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Create Post
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">All Content</p>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <FileText size={18} />
              </div>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {stats.all}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Drafts</p>
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <FileText size={18} />
              </div>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {stats.drafts}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Scheduled</p>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <Clock3 size={18} />
              </div>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {stats.scheduled}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Published</p>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {stats.published}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Search + filters */}
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search content..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveStatus(status)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      activeStatus === status
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {platformFilters.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setActivePlatform(platform)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    activePlatform === platform
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="p-4 sm:p-5">
            {filteredContent.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                  <FileText size={28} />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  No content found
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Try changing your search or filters, or create a new post.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/create-post")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Create Post
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredContent.map((item) => (
                  <div
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                      <div className="absolute left-3 top-3">
                        <StatusBadge status={item.status} />
                      </div>

                      <div className="absolute right-3 top-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur">
                          <PlatformIcon platform={item.platform} />
                        </div>
                      </div>

                      <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                        {item.mediaType}
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="min-w-0 text-left"
                        >
                          <h3 className="truncate text-sm font-bold text-slate-900 hover:text-blue-600">
                            {item.title}
                          </h3>
                        </button>

                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setMenuId(menuId === item.id ? null : item.id)
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {menuId === item.id && (
                            <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                              >
                                <Pencil size={15} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => duplicateItem(item)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                              >
                                <Copy size={15} />
                                Duplicate
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteItem(item.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                        {item.caption}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <PlatformIcon platform={item.platform} />
                          <span>{item.platform}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarDays size={14} />
                          <span>{item.date}</span>
                        </div>
                      </div>

                      {item.time && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock3 size={13} />
                          {item.time}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:px-5">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {filteredContent.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {content.length}
            </span>{" "}
            content items
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedItem.title}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedItem.platform} · {selectedItem.mediaType}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5">
              <img
                src={selectedItem.thumbnail}
                alt={selectedItem.title}
                className="max-h-80 w-full rounded-xl object-cover"
              />

              <div className="mt-5 flex items-center justify-between">
                <StatusBadge status={selectedItem.status} />

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <PlatformIcon platform={selectedItem.platform} />
                  {selectedItem.platform}
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-700">
                  {selectedItem.caption}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays size={16} />
                {selectedItem.date}
                {selectedItem.time && (
                  <>
                    <span>•</span>
                    <Clock3 size={16} />
                    {selectedItem.time}
                  </>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    navigate("/create-post");
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Pencil size={16} />
                  Edit Content
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Content;