import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileVideo,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";

import {
  FaInstagram,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";

import { postStorage } from "../services/postStorage";
import type { PublisherPost } from "../types/post";

const platforms = [
  {
    name: "Instagram",
    username: "@creator_rb",
    status: "Connected",
    icon: FaInstagram,
    posts: "42 posts",
  },
  {
    name: "YouTube",
    username: "RB Creator",
    status: "Connected",
    icon: FaYoutube,
    posts: "28 videos",
  },
  {
    name: "TikTok",
    username: "@rbcreator",
    status: "Connected",
    icon: FaTiktok,
    posts: "36 posts",
  },
];

function StatCard({
  title,
  value,
  change,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={20} />
        </div>

        <button
          type="button"
          className="text-slate-400 transition hover:text-slate-700"
          aria-label={`More options for ${title}`}
        >
          <MoreHorizontal size={19} />
        </button>
      </div>

      <div className="mt-5">
        <p className="text-sm text-slate-500">{title}</p>

        <div className="mt-1 flex items-end gap-2">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>

          <span className="mb-1 flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
            <TrendingUp size={12} />
            {change}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function PlatformIcon({
  name,
  size = 15,
}: {
  name: string;
  size?: number;
}) {
  if (name === "Instagram") {
    return <FaInstagram size={size} />;
  }

  if (name === "YouTube") {
    return <FaYoutube size={size} />;
  }

  return <FaTiktok size={size} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PublisherPost[]>([]);

  useEffect(() => {
    setPosts(postStorage.getAllPosts());
  }, []);

  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.status === "Published").length;
  const scheduledPosts = posts.filter(p => p.status === "Scheduled").length;

  const dynamicStats = [
    {
      title: "Total Posts",
      value: totalPosts.toString(),
      change: "+12.5%",
      description: "vs last month",
      icon: FileVideo,
    },
    {
      title: "Published",
      value: publishedPosts.toString(),
      change: "+18.2%",
      description: "vs last month",
      icon: CheckCircle2,
    },
    {
      title: "Scheduled",
      value: scheduledPosts.toString(),
      change: "+4.6%",
      description: "upcoming posts",
      icon: Clock3,
    },
    {
      title: "Connected Accounts",
      value: "7",
      change: "+2",
      description: "this month",
      icon: Users,
    },
  ];

  const recentDynamicPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  }, [posts]);
  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Saturday, September 12
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Good evening, Creator 👋
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s what&apos;s happening with your content today.
          </p>
        </div>

        <button
          onClick={() => navigate("/create-post")}
          type="button"
          className="flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Create Post
        </button>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dynamicStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* Main Grid */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.8fr)]">
        {/* Recent Posts */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Recent Posts
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Your latest content activity
              </p>
            </div>

            <button
              onClick={() => navigate("/content")}
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentDynamicPosts.length === 0 ? (
              <div className="p-8 text-center text-sm font-medium text-slate-500">
                No recent posts
              </div>
            ) : (
              recentDynamicPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  {/* Thumbnail */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-slate-100 text-slate-400 border border-slate-200">
                    {post.thumbnail ? (
                      <img src={post.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <FileVideo size={22} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="truncate text-sm font-semibold text-slate-800">
                        {post.title}
                      </h3>

                      <span
                        className={`w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${
                          post.status === "Published"
                            ? "bg-emerald-50 text-emerald-700"
                            : post.status === "Scheduled"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{post.date} {post.time || ""}</span>

                      <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

                      <span>— views</span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1 text-[10px] font-medium text-slate-500">
                        <PlatformIcon name={post.platform} size={11} />
                        {post.platform}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="hidden self-start text-slate-400 hover:text-slate-700 sm:block"
                    aria-label={`More options for ${post.title}`}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Quick Actions
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex flex-col items-start rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Upload size={18} />
                </div>

                <span className="mt-3 text-sm font-semibold text-slate-800">
                  Upload
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  Add new media
                </span>
              </button>

              <button
                onClick={() => navigate("/calendar")}
                type="button"
                className="flex flex-col items-start rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CalendarDays size={18} />
                </div>

                <span className="mt-3 text-sm font-semibold text-slate-800">
                  Schedule
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  Plan your content
                </span>
              </button>
            </div>
          </section>

          {/* Connected Accounts */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Connected Accounts
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Your social platforms
                </p>
              </div>

              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Manage
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {platforms.map((platform) => {
                const Icon = platform.icon;

                return (
                  <div
                    key={platform.name}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {platform.name}
                      </p>

                      <p className="truncate text-xs text-slate-400">
                        {platform.username}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                        <span className="text-[10px] font-medium text-emerald-600">
                          {platform.status}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {platform.posts}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              >
                <Plus size={16} />
                Connect another account
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Performance Overview */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Content Performance
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Overview of your content performance
            </p>
          </div>

          <select
            defaultValue="30"
            className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Total Views</p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              1.24M
            </p>

            <p className="mt-1 text-xs font-medium text-emerald-600">
              +24.8% from previous period
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Engagement</p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              86.4K
            </p>

            <p className="mt-1 text-xs font-medium text-emerald-600">
              +16.2% from previous period
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">New Followers</p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              +8,642
            </p>

            <p className="mt-1 text-xs font-medium text-emerald-600">
              +12.7% from previous period
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
