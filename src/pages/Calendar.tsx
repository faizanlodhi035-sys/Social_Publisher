import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  FileText,
  Filter,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import type { PublisherPost, Platform, PostStatus } from "../types/post";
import { postStorage } from "../services/postStorage";
import { schedulingApi } from "../services/scheduling/schedulingApi";

const platformBadgeStyles: Record<
  Platform,
  { bg: string; text: string; border: string }
> = {
  Instagram: {
    bg: "bg-pink-50",
    text: "text-pink-600",
    border: "border-pink-200",
  },
  Facebook: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
  },
  TikTok: {
    bg: "bg-slate-900",
    text: "text-white",
    border: "border-slate-800",
  },
  YouTube: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
  },
};

const statusBadgeStyles: Record<
  PostStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  Scheduled: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    label: "Scheduled",
  },
  Draft: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "Draft",
  },
  Published: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "Published",
  },
  Failed: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    label: "Failed",
  },
  Publishing: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    label: "Publishing...",
  },
  Cancelled: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-300",
    label: "Cancelled",
  },
};

export function PlatformIcon({
  platform,
  size = 14,
}: {
  platform: Platform;
  size?: number;
}) {
  switch (platform) {
    case "Instagram":
      return <FaInstagram size={size} />;
    case "Facebook":
      return <FaFacebook size={size} />;
    case "TikTok":
      return <FaTiktok size={size} />;
    case "YouTube":
      return <FaYoutube size={size} />;
    default:
      return null;
  }
}

export function StatusBadge({ status }: { status: PostStatus }) {
  const style = statusBadgeStyles[status] || statusBadgeStyles.Scheduled;

  const getIcon = () => {
    switch (status) {
      case "Scheduled":
        return <Clock3 size={12} />;
      case "Draft":
        return <FileText size={12} />;
      case "Published":
        return <CheckCircle2 size={12} />;
      case "Failed":
        return <AlertCircle size={12} />;
      case "Publishing":
        return <Loader2 size={12} className="animate-spin" />;
      case "Cancelled":
        return <X size={12} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text} ${style.border}`}
    >
      {getIcon()}
      {style.label}
    </span>
  );
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarGridDays(year: number, month: number): Date[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  const days: Date[] = [];
  const startDate = new Date(year, month, 1 - startingDayOfWeek);

  // 35 or 42 grid cells for 5 or 6 weeks
  for (let i = 0; i < 35; i++) {
    const day = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + i
    );
    days.push(day);
  }

  // If month ends beyond 35th day, add another week (42 days)
  const lastGridDay = days[days.length - 1];
  const lastDayOfMonth = new Date(year, month + 1, 0);
  if (lastGridDay < lastDayOfMonth) {
    for (let i = 35; i < 42; i++) {
      const day = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + i
      );
      days.push(day);
    }
  }

  return days;
}

export default function Calendar() {
  const navigate = useNavigate();
  const today = new Date();

  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [posts, setPosts] = useState<PublisherPost[]>([]);

  useEffect(() => {
    const localPosts = postStorage.getAllPosts();
    setPosts(localPosts);

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
              mediaUrls: sp.mediaUrls,
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
          setPosts(merged);
        }
      })
      .catch((err) => console.warn("Could not fetch remote scheduled posts:", err));
  }, []);

  const [platformFilter, setPlatformFilter] = useState<Platform | "All">(
    "All"
  );
  const [statusFilter, setStatusFilter] = useState<PostStatus | "All">("All");
  const [viewMode, setViewMode] = useState<"Month" | "Week">("Month");
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Selected post for view / edit modal
  const [selectedPost, setSelectedPost] = useState<PublisherPost | null>(null);
  const [isEditingSelectedPost, setIsEditingSelectedPost] = useState(false);

  // Quick Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalDate, setScheduleModalDate] = useState<string>(
    formatDateString(today)
  );

  // Quick schedule form state
  const [newTitle, setNewTitle] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [newTime, setNewTime] = useState("10:00 AM");
  const [newPlatform, setNewPlatform] = useState<Platform>("Instagram");
  const [newStatus, setNewStatus] = useState<PostStatus>("Scheduled");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarGridDays = useMemo(
    () => getCalendarGridDays(year, month),
    [year, month]
  );

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchPlatform =
        platformFilter === "All" || post.platform === platformFilter;
      const matchStatus =
        statusFilter === "All" || post.status === statusFilter;
      return matchPlatform && matchStatus;
    });
  }, [posts, platformFilter, statusFilter]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleOpenScheduleModal = (dateStr?: string) => {
    setScheduleModalDate(dateStr || formatDateString(new Date()));
    setNewTitle("");
    setNewCaption("");
    setNewTime("10:00 AM");
    setNewPlatform("Instagram");
    setNewStatus("Scheduled");
    setShowScheduleModal(true);
  };

  const handleCreateSchedulePost = async () => {
    if (!newTitle.trim()) return;

    const newPost: PublisherPost = {
      id: `post-${Date.now()}`,
      title: newTitle.trim(),
      caption: newCaption.trim() || newTitle.trim(),
      date: scheduleModalDate,
      time: newTime || "12:00 PM",
      platform: newPlatform,
      status: newStatus,
      thumbnail:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      mediaType: "Image",
      createdAt: Date.now()
    };

    postStorage.savePosts([newPost]);
    setPosts(postStorage.getAllPosts());
    setShowScheduleModal(false);

    try {
      await schedulingApi.schedulePost({
        postId: newPost.id,
        caption: newPost.caption,
        platforms: [newPlatform],
        scheduleDate: scheduleModalDate,
        scheduleTime: newTime || "12:00 PM",
      });
    } catch (err) {
      console.warn("Backend schedule post sync fallback:", err);
    }
  };

  const handleDeletePost = async (id: string) => {
    postStorage.deletePost(id);
    setPosts(postStorage.getAllPosts());
    if (selectedPost?.id === id) {
      setSelectedPost(null);
      setIsEditingSelectedPost(false);
    }
    try {
      await schedulingApi.cancelScheduledPost(id);
    } catch (err) {
      console.warn("Backend cancel sync fallback:", err);
    }
  };

  const handleUpdatePost = async (updated: PublisherPost) => {
    postStorage.savePosts([updated]);
    setPosts(postStorage.getAllPosts());
    setSelectedPost(updated);
    setIsEditingSelectedPost(false);
    try {
      await schedulingApi.reschedulePost(updated.id, updated.date, updated.time || "10:00 AM");
    } catch (err) {
      console.warn("Backend reschedule sync fallback:", err);
    }
  };

  const handleDropPost = async (postId: string, newDateStr: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      const updated = { ...post, date: newDateStr, status: "Scheduled" as PostStatus };
      postStorage.savePosts([updated]);
      setPosts(postStorage.getAllPosts());
      try {
        await schedulingApi.reschedulePost(postId, newDateStr, post.time || "10:00 AM");
      } catch (err) {
        console.warn("Backend drop reschedule sync fallback:", err);
      }
    }
    setDragOverDate(null);
  };

  const getPostsForDate = (date: Date) => {
    const dateStr = formatDateString(date);
    return filteredPosts.filter((post) => post.date === dateStr);
  };

  // Stats calculation
  const scheduledCount = posts.filter((p) => p.status === "Scheduled").length;
  const draftCount = posts.filter((p) => p.status === "Draft").length;
  const publishedCount = posts.filter((p) => p.status === "Published").length;
  const failedCount = posts.filter((p) => p.status === "Failed").length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Top Header Section */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Social Publisher Calendar
                </h1>
                <p className="text-xs font-medium text-slate-500 md:text-sm">
                  Plan, schedule, drag-and-drop, and manage multi-platform posts visually.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenScheduleModal()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Plus size={16} />
              Quick Schedule
            </button>

            <button
              onClick={() => navigate("/create-post")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
            >
              <Plus size={18} />
              Create Post
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Scheduled
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Clock3 size={15} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {scheduledCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Drafts</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <FileText size={15} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {draftCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Published
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={15} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {publishedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Failed</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle size={15} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {failedCount}
            </p>
          </div>
        </div>

        {/* Main Calendar Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-4 md:p-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Navigation & Month Heading */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={prevMonth}
                  className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-l-xl border-r border-slate-200"
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-r-xl border-l border-slate-200"
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <h2 className="ml-2 text-lg font-extrabold text-slate-900 md:text-xl">
                {monthName}
              </h2>
            </div>

            {/* Filters & View Switches */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Filter size={14} />
                <span>Filters:</span>
              </div>

              {/* Platform Filter */}
              <select
                value={platformFilter}
                onChange={(e) =>
                  setPlatformFilter(e.target.value as Platform | "All")
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-sm"
              >
                <option value="All">All Platforms</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as PostStatus | "All")
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Failed">Failed</option>
              </select>

              {/* View Toggle */}
              <div className="flex rounded-xl border border-slate-200 bg-slate-100/70 p-1">
                <button
                  onClick={() => setViewMode("Month")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    viewMode === "Month"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode("Week")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    viewMode === "Week"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Month View Grid */}
          {viewMode === "Month" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[850px]">
                {/* 7 Days Headers */}
                <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/50">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                {/* Calendar Days Cells */}
                <div className="grid grid-cols-7">
                  {calendarGridDays.map((date, idx) => {
                    const dateStr = formatDateString(date);
                    const isCurrentMonth = date.getMonth() === month;
                    const isToday =
                      dateStr === formatDateString(today);
                    const dayPosts = getPostsForDate(date);
                    const isOver = dragOverDate === dateStr;

                    return (
                      <div
                        key={`${dateStr}-${idx}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverDate !== dateStr) {
                            setDragOverDate(dateStr);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverDate === dateStr) {
                            setDragOverDate(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const postId = e.dataTransfer.getData("text/plain");
                          if (postId) {
                            handleDropPost(postId, dateStr);
                          }
                        }}
                        className={`group relative min-h-[140px] border-b border-r border-slate-100 p-2 transition-colors ${
                          isOver
                            ? "bg-indigo-100/60 ring-2 ring-indigo-500 ring-inset"
                            : !isCurrentMonth
                            ? "bg-slate-50/40 opacity-50"
                            : "bg-white hover:bg-slate-50/30"
                        } ${isToday && !isOver ? "bg-indigo-50/20" : ""}`}
                      >
                        {/* Day Cell Header */}
                        <div className="mb-1.5 flex items-center justify-between">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                              isToday
                                ? "bg-slate-900 text-white shadow-sm"
                                : isCurrentMonth
                                ? "text-slate-700"
                                : "text-slate-400"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          <button
                            onClick={() => handleOpenScheduleModal(dateStr)}
                            className="opacity-0 transition-opacity group-hover:opacity-100 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            title="Schedule post on this date"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Cell Post Cards */}
                        <div className="space-y-1.5">
                          {dayPosts.map((post) => {
                            const pStyle = platformBadgeStyles[post.platform];

                            return (
                              <div
                                key={post.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", post.id);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onClick={() => {
                                  setSelectedPost(post);
                                  setIsEditingSelectedPost(false);
                                }}
                                className="group/card cursor-grab active:cursor-grabbing rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm transition hover:border-slate-400 hover:shadow-md"
                              >
                                <div className="flex items-start gap-1.5">
                                  {/* Drag Handle Icon */}
                                  <div className="mt-0.5 text-slate-300 group-hover/card:text-slate-500">
                                    <GripVertical size={12} />
                                  </div>

                                  {/* Platform Icon Badge */}
                                  <div
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${pStyle.bg} ${pStyle.text}`}
                                  >
                                    <PlatformIcon
                                      platform={post.platform}
                                      size={11}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-slate-800">
                                      {post.title}
                                    </p>

                                    <div className="mt-1 flex items-center justify-between gap-1">
                                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                                        <Clock3 size={10} />
                                        {post.time}
                                      </span>

                                      <StatusBadge status={post.status} />
                                    </div>
                                  </div>

                                  {/* Media Thumbnail preview if available */}
                                  {post.thumbnail && (
                                    <img
                                      src={post.thumbnail}
                                      alt="Thumbnail"
                                      className="h-7 w-7 rounded-md object-cover border border-slate-200 shrink-0"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Week View Grid */
            <WeekView
              currentDate={currentDate}
              posts={filteredPosts}
              todayDate={today}
              dragOverDate={dragOverDate}
              onSetDragOverDate={setDragOverDate}
              onDropPost={handleDropPost}
              onSelectPost={(post) => {
                setSelectedPost(post);
                setIsEditingSelectedPost(false);
              }}
              onScheduleDate={(dateStr) => handleOpenScheduleModal(dateStr)}
            />
          )}
        </div>

        {/* Global Empty State if 0 posts match filter */}
        {filteredPosts.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CalendarIcon size={24} />
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-800">
              No scheduled posts found
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your platform or status filters, or schedule a new
              post.
            </p>
            <button
              onClick={() => handleOpenScheduleModal()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
            >
              <Plus size={14} />
              Schedule Post Now
            </button>
          </div>
        )}
      </div>

      {/* Post Details & Edit Modal */}
      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          isEditing={isEditingSelectedPost}
          onClose={() => {
            setSelectedPost(null);
            setIsEditingSelectedPost(false);
          }}
          onEditToggle={() => setIsEditingSelectedPost((prev) => !prev)}
          onDelete={() => handleDeletePost(selectedPost.id)}
          onUpdate={handleUpdatePost}
        />
      )}

      {/* Quick Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Quick Schedule Post
                </h3>
                <p className="text-xs text-slate-500">
                  Add a post directly to the social calendar.
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. New Feature Launch Announcement"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Caption
                </label>
                <textarea
                  rows={3}
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Write your social post caption here..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={scheduleModalDate}
                    onChange={(e) => setScheduleModalDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Platform
                  </label>
                  <select
                    value={newPlatform}
                    onChange={(e) =>
                      setNewPlatform(e.target.value as Platform)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as PostStatus)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedulePost}
                disabled={!newTitle.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40"
              >
                Schedule Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Week View Component
function WeekView({
  currentDate,
  posts,
  todayDate,
  dragOverDate,
  onSetDragOverDate,
  onDropPost,
  onSelectPost,
  onScheduleDate,
}: {
  currentDate: Date;
  posts: PublisherPost[];
  todayDate: Date;
  dragOverDate: string | null;
  onSetDragOverDate: (dateStr: string | null) => void;
  onDropPost: (postId: string, dateStr: string) => void;
  onSelectPost: (post: PublisherPost) => void;
  onScheduleDate: (dateStr: string) => void;
}) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[900px] grid-cols-7 border-t border-slate-200/80">
        {weekDays.map((date, idx) => {
          const dateStr = formatDateString(date);
          const dayPosts = posts.filter((p) => p.date === dateStr);
          const isToday = dateStr === formatDateString(todayDate);
          const isOver = dragOverDate === dateStr;

          return (
            <div
              key={`${dateStr}-${idx}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverDate !== dateStr) {
                  onSetDragOverDate(dateStr);
                }
              }}
              onDragLeave={() => {
                if (dragOverDate === dateStr) {
                  onSetDragOverDate(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const postId = e.dataTransfer.getData("text/plain");
                if (postId) {
                  onDropPost(postId, dateStr);
                }
              }}
              className={`min-h-[420px] border-r border-slate-100 p-3 last:border-r-0 transition-colors ${
                isOver
                  ? "bg-indigo-100/60 ring-2 ring-indigo-500 ring-inset"
                  : isToday
                  ? "bg-indigo-50/20"
                  : "bg-white"
              }`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p
                    className={`text-lg font-extrabold ${
                      isToday ? "text-indigo-600" : "text-slate-900"
                    }`}
                  >
                    {date.getDate()}
                  </p>
                </div>
                <button
                  onClick={() => onScheduleDate(dateStr)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                  title="Schedule post"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {dayPosts.map((post) => {
                  const pStyle = platformBadgeStyles[post.platform];
                  return (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", post.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onSelectPost(post)}
                      className="group/card cursor-grab active:cursor-grabbing rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm transition hover:border-slate-400 hover:shadow-md"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <GripVertical size={12} className="text-slate-300 group-hover/card:text-slate-500" />
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-md ${pStyle.bg} ${pStyle.text}`}
                          >
                            <PlatformIcon platform={post.platform} size={11} />
                          </div>
                        </div>
                        <StatusBadge status={post.status} />
                      </div>

                      <p className="text-xs font-bold text-slate-800 line-clamp-2">
                        {post.title}
                      </p>

                      {post.thumbnail && (
                        <img
                          src={post.thumbnail}
                          alt="Thumbnail"
                          className="mt-2 h-16 w-full rounded-lg object-cover border border-slate-100"
                        />
                      )}

                      <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <Clock3 size={10} />
                        {post.time}
                      </p>
                    </div>
                  );
                })}

                {dayPosts.length === 0 && (
                  <p className="py-8 text-center text-xs font-medium text-slate-300">
                    No posts
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Post Details & Edit Modal Component
function PostDetailsModal({
  post,
  isEditing,
  onClose,
  onEditToggle,
  onDelete,
  onUpdate,
}: {
  post: PublisherPost;
  isEditing: boolean;
  onClose: () => void;
  onEditToggle: () => void;
  onDelete: () => void;
  onUpdate: (updated: PublisherPost) => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [date, setDate] = useState(post.date);
  const [time, setTime] = useState(post.time);
  const [platform, setPlatform] = useState<Platform>(post.platform);
  const [status, setStatus] = useState<PostStatus>(post.status);

  const handleSave = () => {
    onUpdate({
      ...post,
      title: title.trim(),
      caption: caption.trim(),
      date,
      time,
      platform,
      status,
    });
  };

  const pStyle = platformBadgeStyles[platform];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${pStyle.bg} ${pStyle.text}`}
            >
              <PlatformIcon platform={platform} size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {platform} Post
              </h3>
              <StatusBadge status={status} />
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="max-h-[75vh] overflow-y-auto p-5 space-y-4">
          {/* Media Preview if exists */}
          {post.thumbnail && (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
              <img
                src={post.thumbnail}
                alt="Post Preview"
                className="max-h-48 w-full object-cover"
              />
              <span className="absolute top-2 right-2 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                {post.mediaType || "Media"} Preview
              </span>
            </div>
          )}

          {!isEditing ? (
            /* View Mode */
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  {post.title}
                </h4>
                <p className="mt-1 text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                  {post.caption}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-400">
                    Scheduled Date
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {post.date}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-400">
                    Scheduled Time
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {post.time}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Edit / Reschedule Mode */
            <div className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Caption
                </label>
                <textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Reschedule Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Reschedule Time
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PostStatus)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
          >
            <Trash2 size={14} />
            Delete Post
          </button>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={onEditToggle}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
              >
                <Edit3 size={14} />
                Edit / Reschedule
              </button>
            ) : (
              <>
                <button
                  onClick={onEditToggle}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}