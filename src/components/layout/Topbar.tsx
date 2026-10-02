import { useState } from "react";
import {
  Bell,
  LogOut,
  Menu,
  Plus,
  Search,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const getInitials = () => {
    if (!user || !user.email) return "SP";
    return user.email.substring(0, 2).toUpperCase();
  };

  const handleCreatePost = () => {
    navigate("/create-post");
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>

        <div className="hidden md:flex h-9 w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-950">
          <Search size={17} className="text-slate-400" />

          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
          />

          <span className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 lg:block dark:border-slate-800 dark:bg-slate-900">
            Ctrl K
          </span>
        </div>

        <div className="md:hidden">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Social Publisher
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        <button
          type="button"
          onClick={handleCreatePost}
          className="hidden items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:flex"
        >
          <Plus size={17} />
          Create Post
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        {/* User Profile Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Open profile menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white hover:ring-2 hover:ring-blue-400 transition"
          >
            {getInitials()}
          </button>

          {/* Profile Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-fadeIn">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-400">Signed in as</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user?.email || "User"}
                </p>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate("/settings");
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                >
                  <UserIcon size={16} />
                  <span>Account Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition text-left"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}