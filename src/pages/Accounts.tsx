import { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Link2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { socialApi } from "../services/social/socialApi";
import type { ConnectedSocialAccount, SocialPlatform, ConnectionStatus } from "../types/social";

const platformInfo: Record<
  SocialPlatform,
  {
    description: string;
    icon: React.ReactNode;
    iconClass: string;
    bgClass: string;
  }
> = {
  Instagram: {
    description: "Photos, Reels and Stories",
    icon: <FaInstagram size={22} />,
    iconClass: "text-pink-600",
    bgClass: "bg-pink-50",
  },
  Facebook: {
    description: "Pages, Posts and Reels",
    icon: <FaFacebook size={22} />,
    iconClass: "text-blue-600",
    bgClass: "bg-blue-50",
  },
  TikTok: {
    description: "Short-form videos",
    icon: <FaTiktok size={21} />,
    iconClass: "text-slate-900",
    bgClass: "bg-slate-100",
  },
  YouTube: {
    description: "Videos and Shorts",
    icon: <FaYoutube size={22} />,
    iconClass: "text-red-600",
    bgClass: "bg-red-50",
  },
};

const platforms: SocialPlatform[] = ["Instagram", "Facebook", "TikTok", "YouTube"];

function StatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 size={13} />
        Connected
      </span>
    );
  }
  if (status === "needs_attention") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <AlertCircle size={13} />
        Needs Attention
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <X size={13} />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      <X size={13} />
      Disconnected
    </span>
  );
}

function PlatformIcon({ platform, size = 20 }: { platform: SocialPlatform; size?: number }) {
  if (platform === "Instagram") return <FaInstagram size={size} />;
  if (platform === "Facebook") return <FaFacebook size={size} />;
  if (platform === "TikTok") return <FaTiktok size={size} />;
  return <FaYoutube size={size} />;
}

import { useLocation } from "react-router-dom";
import type { ProviderStatusInfo } from "../services/social/socialApi";

export default function Accounts() {
  const location = useLocation();
  const [accounts, setAccounts] = useState<ConnectedSocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusInfo[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);

  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedSocialAccount | null>(null);

  useEffect(() => {
    let mounted = true;

    // Check OAuth URL query parameters
    const params = new URLSearchParams(location.search);
    const oauthStatus = params.get("oauth");
    const platformParam = params.get("platform");
    const messageParam = params.get("message");

    if (oauthStatus === "success") {
      setNotification({
        type: "success",
        message: `Successfully connected ${platformParam || "social"} account!`,
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthStatus === "error") {
      setNotification({
        type: "error",
        message: messageParam || `Failed to connect ${platformParam || "social"} account.`,
      });
      window.history.replaceState({}, "", window.location.pathname);
    }

    socialApi.getAuthStatus().then(statuses => {
      if (mounted) setProviderStatuses(statuses);
    });

    socialApi.getConnectedAccounts()
      .then(data => {
        if (mounted) {
          setAccounts(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setGlobalError(err instanceof Error ? err.message : "Failed to load accounts.");
          setIsLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [location.search]);

  const stats = useMemo(() => {
    return {
      total: accounts.length,
      connected: accounts.filter((account) => account.status === "connected").length,
      attention: accounts.filter((account) => account.status === "needs_attention").length,
    };
  }, [accounts]);

  const isConnected = (platform: SocialPlatform) =>
    accounts.some((account) => account.platform === platform && account.status !== "disconnected");

  const connectPlatform = (platform: SocialPlatform) => {
    const status = providerStatuses.find(p => p.platform.toLowerCase() === platform.toLowerCase());
    if (status && !status.configured) {
      setNotification({
        type: "error",
        message: `${platform} integration is not configured on the backend server. Please add API credentials to backend/.env (${status.missingEnvVars.join(", ")})`,
      });
      setShowConnectModal(false);
      return;
    }

    socialApi.connectAccount(platform);
  };

  const reconnectAccount = async (account: ConnectedSocialAccount) => {
    try {
      await socialApi.refreshAccount(account.id);
      setAccounts((current) =>
        current.map((item) =>
          item.id === account.id ? { ...item, status: "connected" } : item
        )
      );
    } catch (err) {
      alert("Failed to reconnect account. Backend might be unavailable.");
    }
    setMenuId(null);
  };

  const disconnectAccount = async (id: string) => {
    try {
      await socialApi.disconnectAccount(id);
      setAccounts((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: "disconnected" } : item
        )
      );
    } catch (err) {
      alert("Failed to disconnect account. Backend might be unavailable.");
    }
    setMenuId(null);
  };

  const removeAccount = async (id: string) => {
    try {
      await socialApi.disconnectAccount(id);
      setAccounts((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      alert("Failed to remove account.");
    }
    setMenuId(null);
    setSelectedAccount(null);
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Connected Accounts
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Connect and manage all your social media accounts securely.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Connect Account
          </button>
        </div>

        {notification && (
          <div
            className={`mb-6 flex items-center justify-between rounded-xl border p-4 text-sm font-medium ${
              notification.type === "error"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400"
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              <p>{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {globalError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{globalError}</p>
          </div>
        )}

        {/* Overview */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Accounts</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-3 text-blue-600 dark:text-blue-400">
                <Users size={21} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Connected</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.connected}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-3 text-emerald-600 dark:text-emerald-400">
                <Check size={21} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Needs Attention</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.attention}</p>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 p-3 text-amber-600 dark:text-amber-400">
                <AlertCircle size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* Security notice */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 p-4 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow-sm">
            <ShieldCheck size={21} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Your accounts are securely connected
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
              We use secure authorization. No passwords or tokens are stored in the browser.
            </p>
          </div>
        </div>

        {/* Accounts */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm transition-colors">
          <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Your Accounts</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Manage connected profiles and pages.</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading accounts...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 text-slate-500 dark:text-slate-400">
                  <Link2 size={28} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                  No accounts connected
                </h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Connect your first social media account to start publishing.
                </p>
                <button
                  type="button"
                  onClick={() => setShowConnectModal(true)}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Connect Account
                </button>
              </div>
            ) : (
              accounts.map((account) => {
                const info = platformInfo[account.platform];

                return (
                  <div
                    key={account.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-900/50 sm:flex-row sm:items-center"
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${info.bgClass} ${info.iconClass} dark:bg-opacity-10`}>
                      <PlatformIcon platform={account.platform} size={22} />
                    </div>

                    {account.avatarUrl && (
                      <img
                        src={account.avatarUrl}
                        alt={account.displayName}
                        className="hidden h-11 w-11 rounded-full object-cover ring-2 ring-white dark:ring-slate-900 sm:block"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {account.displayName}
                        </h3>
                        <StatusBadge status={account.status} />
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {account.username}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock3 size={12} />
                          Connected {account.connectedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      {account.status === "needs_attention" && (
                        <button
                          type="button"
                          onClick={() => reconnectAccount(account)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                        >
                          <RefreshCw size={14} />
                          Reconnect
                        </button>
                      )}

                      {account.status === "connected" && (
                        <button
                          type="button"
                          onClick={() => setSelectedAccount(account)}
                          className="hidden items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 sm:inline-flex"
                        >
                          Manage
                          <ChevronRight size={14} />
                        </button>
                      )}

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuId(menuId === account.id ? null : account.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {menuId === account.id && (
                          <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-xl">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccount(account);
                                setMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <ExternalLink size={15} />
                              Account Details
                            </button>

                            {account.status !== "connected" && (
                              <button
                                type="button"
                                onClick={() => reconnectAccount(account)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <RefreshCw size={15} />
                                Reconnect
                              </button>
                            )}

                            {account.status === "connected" && (
                              <button
                                type="button"
                                onClick={() => disconnectAccount(account.id)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <X size={15} />
                                Disconnect
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => removeAccount(account.id)}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                            >
                              <Trash2 size={15} />
                              Remove Account
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Available platforms */}
        <div className="mt-6">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Add Another Platform</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Connect another social account to publish from one place.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => {
              const info = platformInfo[platform];
              const connected = isConnected(platform);

              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(platform);
                    setShowConnectModal(true);
                  }}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-left shadow-sm transition hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-md"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${info.bgClass} ${info.iconClass} dark:bg-opacity-10`}>
                    <PlatformIcon platform={platform} size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{platform}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{info.description}</p>
                  </div>

                  {connected ? (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                  ) : (
                    <Plus size={18} className="shrink-0 text-slate-400 transition group-hover:text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowConnectModal(false);
            setSelectedPlatform(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Connect Social Account</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose a platform to connect.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConnectModal(false);
                  setSelectedPlatform(null);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {platforms.map((platform) => {
                  const info = platformInfo[platform];
                  const selected = selectedPlatform === platform;

                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setSelectedPlatform(platform)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-100 dark:ring-blue-900/50"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${info.bgClass} ${info.iconClass} dark:bg-opacity-10`}>
                        <PlatformIcon platform={platform} size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{platform}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{info.description}</p>
                      </div>
                      {selected && <Check size={17} className="text-blue-600 dark:text-blue-400" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
                <div className="flex gap-3">
                  <ShieldCheck size={19} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Secure authorization</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      This button will securely redirect you to {selectedPlatform || 'the provider'} to authorize access. No credentials are saved in the browser.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!selectedPlatform}
                onClick={() => selectedPlatform && connectPlatform(selectedPlatform)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500"
              >
                <Link2 size={17} />
                Connect {selectedPlatform ? selectedPlatform : "Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {selectedAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedAccount(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Account Details</h2>
              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4">
                {selectedAccount.avatarUrl ? (
                  <img
                    src={selectedAccount.avatarUrl}
                    alt={selectedAccount.displayName}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                    <PlatformIcon platform={selectedAccount.platform} size={32} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{selectedAccount.displayName}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedAccount.username}</p>
                  <div className="mt-2">
                    <StatusBadge status={selectedAccount.status} />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Platform</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedAccount.platform}</p>
                </div>
                <div className="col-span-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Connected On</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedAccount.connectedAt}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}