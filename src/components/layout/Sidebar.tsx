import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  FileVideo,
  Image,
  LayoutDashboard,
  LogOut,
  Settings,
  Share2,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    label: "Create Post",
    icon: Share2,
    path: "/create-post",
  },
  {
    label: "Content",
    icon: FileVideo,
    path: "/content",
  },
  {
    label: "Calendar",
    icon: CalendarDays,
    path: "/calendar",
  },
  {
    label: "Accounts",
    icon: Users,
    path: "/accounts",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    path: "/analytics",
  },
];

const tools = [
  {
    label: "AI Tools",
    icon: Sparkles,
    path: "/ai-tools",
  },
  {
    label: "Media Library",
    icon: Image,
    path: "/media",
  },
];

const bottomNavigation = [
  {
    label: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getInitials = () => {
    if (!user || !user.email) return "SP";
    return user.email.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
      onMobileClose();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950
          transition-all duration-300
          ${collapsed ? "w-[76px]" : "w-[260px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-slate-200 dark:border-slate-800 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Share2 size={19} strokeWidth={2.5} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  Social Publisher
                </h1>

                <p className="truncate text-[11px] text-slate-500">
                  Creator Workspace
                </p>
              </div>
            )}
          </div>

          {/* Desktop collapse */}
          <button
            type="button"
            onClick={onToggle}
            aria-label="Toggle sidebar"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:flex dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <ChevronLeft
              size={17}
              className={collapsed ? "rotate-180" : ""}
            />
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>
          )}

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                    }`
                  }
                >
                  <Icon
                    size={19}
                    strokeWidth={1.9}
                    className="shrink-0"
                  />

                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>

          {!collapsed && (
            <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Tools
            </p>
          )}

          <div className="space-y-1">
            {tools.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                    }`
                  }
                >
                  <Icon
                    size={19}
                    strokeWidth={1.9}
                    className="shrink-0"
                  />

                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Bottom navigation */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-1">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                  }`
                }
              >
                <Icon size={19} strokeWidth={1.9} />

                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Log Out" : undefined}
            className="w-full flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition text-left"
          >
            <LogOut size={19} strokeWidth={1.9} className="shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>

          {/* User workspace info */}
          <div
            className={`mt-2 flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-900 p-2.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {getInitials()}
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user?.email || "Creator Account"}
                </p>

                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  Logged In
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}