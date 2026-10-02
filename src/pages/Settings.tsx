import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  CheckCircle2,
  Moon,
  Palette,
  Save,
  Send,
  Shield,
  Sun,
  User,
  UserCog,
  CreditCard,
  Tag,
  Gift,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { settingsStorage, defaultProfile, defaultNotifications, defaultPublishing, defaultAppearance, defaultAccount } from "../services/settingsStorage";
import type { ProfileSettings, NotificationSettings, PublishingSettings, AppearanceSettings, AccountSettings, ThemeMode, DefaultPostStatus } from "../types/settings";
import { adminApi, type EffectiveEntitlements } from "../services/adminApi";

type TabId = "profile" | "notifications" | "publishing" | "appearance" | "account" | "plans";

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [statusMsg, setStatusMsg] = useState("");
  
  const [profile, setProfile] = useState<ProfileSettings>(defaultProfile);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [publishing, setPublishing] = useState<PublishingSettings>(defaultPublishing);
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearance);
  const [account, setAccount] = useState<AccountSettings>(defaultAccount);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(settingsStorage.getProfile());
    setNotifications(settingsStorage.getNotifications());
    setPublishing(settingsStorage.getPublishing());
    
    const appSettings = settingsStorage.getAppearance();
    setAppearance(appSettings);
    applyTheme(appSettings.theme);
    
    setAccount(settingsStorage.getAccount());
  }, []);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const applyTheme = (theme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove("dark");
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    }
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    settingsStorage.saveProfile(profile);
    showStatus("Profile settings saved");
  };

  const updateNotification = (key: keyof NotificationSettings, value: boolean) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    settingsStorage.saveNotifications(next);
    showStatus("Notification preferences saved");
  };

  const savePublishing = (e: React.FormEvent) => {
    e.preventDefault();
    settingsStorage.savePublishing(publishing);
    showStatus("Publishing preferences saved");
  };

  const updateAppearance = (key: keyof AppearanceSettings, value: any) => {
    const next = { ...appearance, [key]: value };
    setAppearance(next);
    settingsStorage.saveAppearance(next);
    
    if (key === "theme") {
      applyTheme(value as ThemeMode);
    }
    showStatus("Appearance settings saved");
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfile({ ...profile, avatar: url });
    }
  };

  const confirmAction = (msg: string, callback: () => void) => {
    if (appearance.confirmDestructiveActions) {
      if (window.confirm(msg)) callback();
    } else {
      callback();
    }
  };

  const [myEntitlements, setMyEntitlements] = useState<EffectiveEntitlements | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchEntitlements = async () => {
    try {
      const data = await adminApi.getMyEntitlements();
      setMyEntitlements(data.entitlements);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, []);

  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setRedeeming(true);
    setCouponFeedback(null);
    try {
      const res = await adminApi.redeemCoupon(couponCode.trim());
      setCouponFeedback({ msg: res.message || "Coupon redeemed successfully!", type: "success" });
      setCouponCode("");
      await fetchEntitlements();
    } catch (err: any) {
      setCouponFeedback({ msg: err.message || "Invalid or expired coupon code.", type: "error" });
    } finally {
      setRedeeming(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile & Workspace", icon: <User size={18} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { id: "publishing", label: "Publishing", icon: <Send size={18} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={18} /> },
    { id: "account", label: "Account", icon: <Shield size={18} /> },
    { id: "plans", label: "Plans & Promotions", icon: <CreditCard size={18} /> },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your profile, workspace, publishing preferences and account settings.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 transition-all">
          <CheckCircle2 size={16} />
          {statusMsg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 pb-12">
        {/* Navigation */}
        <aside className="lg:w-64 shrink-0">
          <nav className="flex space-x-2 overflow-x-auto lg:flex-col lg:space-x-0 lg:space-y-1 pb-2 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 max-w-3xl">
          {/* Profile & Workspace */}
          {activeTab === "profile" && (
            <form onSubmit={saveProfile} className="space-y-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h3>
                
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-200 flex items-center justify-center">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User size={32} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Change Avatar
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <input required type="text" value={profile.fullName} onChange={(e) => setProfile({...profile, fullName: e.target.value})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <input required type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 size={20} className="text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900">Workspace Details</h3>
                </div>
                
                <div className="grid gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Workspace Name</label>
                    <input required type="text" value={profile.workspaceName} onChange={(e) => setProfile({...profile, workspaceName: e.target.value})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <textarea rows={3} value={profile.workspaceDescription} onChange={(e) => setProfile({...profile, workspaceDescription: e.target.value})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Timezone</label>
                    <input type="text" value={profile.timezone} onChange={(e) => setProfile({...profile, timezone: e.target.value})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button type="button" onClick={() => setProfile(defaultProfile)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Reset
                </button>
                <button type="submit" className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Notification Preferences</h3>
              
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Publishing</h4>
                <ToggleRow label="Post published" desc="Get notified when a post successfully goes live" checked={notifications.postPublished} onChange={(val) => updateNotification("postPublished", val)} />
                <ToggleRow label="Post failed" desc="Alert me if a post fails to publish" checked={notifications.postFailed} onChange={(val) => updateNotification("postFailed", val)} />
                <ToggleRow label="Scheduled reminders" desc="Notify me 15 minutes before a post goes live" checked={notifications.scheduledReminder} onChange={(val) => updateNotification("scheduledReminder", val)} />
                
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-8">Content & Analytics</h4>
                <ToggleRow label="Draft reminders" desc="Remind me about old unpublished drafts" checked={notifications.draftReminder} onChange={(val) => updateNotification("draftReminder", val)} />
                <ToggleRow label="Weekly summary" desc="Receive a weekly email with analytics highlights" checked={notifications.weeklyAnalytics} onChange={(val) => updateNotification("weeklyAnalytics", val)} />
                
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-8">Account</h4>
                <ToggleRow label="Connection issues" desc="Alert me if a social account gets disconnected" checked={notifications.accountIssues} onChange={(val) => updateNotification("accountIssues", val)} />
                <ToggleRow label="Security alerts" desc="Important security and login notifications" checked={notifications.securityAlerts} onChange={(val) => updateNotification("securityAlerts", val)} />
              </div>
            </div>
          )}

          {/* Publishing */}
          {activeTab === "publishing" && (
            <form onSubmit={savePublishing} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Publishing Defaults</h3>

              <div className="grid gap-6">
                <div className="flex flex-col gap-1.5 max-w-xs">
                  <label className="text-sm font-medium text-slate-700">Default Post Status</label>
                  <select value={publishing.defaultPostStatus} onChange={(e) => setPublishing({...publishing, defaultPostStatus: e.target.value as DefaultPostStatus})} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1">
                    <option value="draft">Save as Draft</option>
                    <option value="scheduled">Schedule Post</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 max-w-xs">
                  <label className="text-sm font-medium text-slate-700">Default Posting Time</label>
                  <input type="time" value={publishing.defaultPostingTime} onChange={(e) => setPublishing({...publishing, defaultPostingTime: e.target.value})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1" />
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <ToggleRow label="Auto-save drafts" desc="Automatically save drafts while typing in Create Post" checked={publishing.autoSaveDrafts} onChange={(val) => setPublishing({...publishing, autoSaveDrafts: val})} />
                  <ToggleRow label="Confirm before publishing" desc="Show a confirmation modal before a post goes live" checked={publishing.confirmBeforePublishing} onChange={(val) => setPublishing({...publishing, confirmBeforePublishing: val})} />
                  <ToggleRow label="Auto-add first comment" desc="Automatically add hashtags as the first comment (if platform supports)" checked={publishing.autoAddFirstComment} onChange={(val) => setPublishing({...publishing, autoAddFirstComment: val})} />
                  <ToggleRow label="Generate link previews" desc="Automatically fetch and attach metadata for links in caption" checked={publishing.linkPreview} onChange={(val) => setPublishing({...publishing, linkPreview: val})} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            </form>
          )}

          {/* Appearance */}
          {activeTab === "appearance" && (
            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Appearance Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-3">Theme</label>
                  <div className="flex gap-3">
                    <ThemeButton icon={<Sun size={18}/>} label="Light" active={appearance.theme === "light"} onClick={() => updateAppearance("theme", "light")} />
                    <ThemeButton icon={<Moon size={18}/>} label="Dark" active={appearance.theme === "dark"} onClick={() => updateAppearance("theme", "dark")} />
                    <ThemeButton icon={<Palette size={18}/>} label="System" active={appearance.theme === "system"} onClick={() => updateAppearance("theme", "system")} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Note: Full dark mode styling is partially implemented for demonstration.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-3">Interface Density</label>
                  <div className="flex gap-3">
                    <button onClick={() => updateAppearance("density", "comfortable")} className={`flex-1 py-2 text-sm font-medium rounded-lg border ${appearance.density === "comfortable" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      Comfortable
                    </button>
                    <button onClick={() => updateAppearance("density", "compact")} className={`flex-1 py-1.5 text-sm font-medium rounded-lg border ${appearance.density === "compact" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      Compact
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <ToggleRow label="Reduce animations" desc="Disable UI transition effects for a snappier experience" checked={appearance.reduceAnimations} onChange={(val) => updateAppearance("reduceAnimations", val)} />
                  <ToggleRow label="Compact navigation" desc="Use a slimmer sidebar by default" checked={appearance.compactNavigation} onChange={(val) => updateAppearance("compactNavigation", val)} />
                  <ToggleRow label="Confirm destructive actions" desc="Always ask before deleting items like posts or media" checked={appearance.confirmDestructiveActions} onChange={(val) => updateAppearance("confirmDestructiveActions", val)} />
                </div>
              </div>
            </div>
          )}

          {/* Account */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{profile.email}</h3>
                  <p className="text-sm text-slate-500">Active Account • Member since 2026</p>
                </div>
                <UserCog size={32} className="text-slate-300" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Security</h3>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Password</p>
                    <p className="text-xs text-slate-500">Last changed 3 months ago</p>
                  </div>
                  <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">Change Password</button>
                </div>
                <ToggleRow label="Two-factor authentication" desc="Add an extra layer of security to your account" checked={account.twoFactorEnabled} onChange={(val) => {
                  setAccount({...account, twoFactorEnabled: val});
                  settingsStorage.saveAccount({...account, twoFactorEnabled: val});
                  showStatus("Security settings updated");
                }} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Connected Accounts</h3>
                <p className="text-sm text-slate-600">Connect your social media profiles to start publishing.</p>
                <button onClick={() => navigate("/accounts")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                  Manage Connected Accounts
                </button>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-rose-900">Danger Zone</h3>
                <p className="text-sm text-rose-700/80">These actions are not reversible once authenticated to a backend.</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => confirmAction("Sign out is unavailable until authentication is integrated.", () => {})} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    Sign Out
                  </button>
                  <button onClick={() => confirmAction("Account deletion will be available when backend services are connected.", () => {})} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">
                    Delete Account
                  </button>
                </div>
                <p className="text-xs text-rose-500 italic mt-2">Demo settings only - no real account will be deleted.</p>
              </div>
            </div>
          )}

          {/* Plans & Promotions */}
          {activeTab === "plans" && (
            <div className="space-y-8">
              {/* Current Plan Overview */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Workspace Plan</span>
                    <h3 className="text-xl font-bold text-slate-900">{myEntitlements?.plan.name || "Free Starter"}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{myEntitlements?.plan.description}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                    {myEntitlements?.plan.id || "FREE"}
                  </span>
                </div>

                {/* Entitlement Quotas */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Effective Limits & Quotas
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 block">Social Accounts</span>
                      <span className="text-lg font-bold text-slate-900">{myEntitlements?.maxSocialAccounts || 2}</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 block">AI Generations</span>
                      <span className="text-lg font-bold text-purple-700 font-mono">
                        {myEntitlements?.maxAiGenerations || 15}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 block">Scheduled Posts</span>
                      <span className="text-lg font-bold text-slate-900">{myEntitlements?.maxScheduledPosts || 5}</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-500 block">Media Storage</span>
                      <span className="text-lg font-bold text-slate-900">{myEntitlements?.maxStorageMB || 50} MB</span>
                    </div>
                  </div>
                </div>

                {/* Active Granted Benefits */}
                {myEntitlements?.activeBenefits && myEntitlements.activeBenefits.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-500" /> Granted Promotional Benefits
                    </h4>
                    <div className="space-y-2">
                      {myEntitlements.activeBenefits.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs">
                          <span className="font-semibold text-amber-900">+{b.value} {b.type.replace("_", " ").toUpperCase()}</span>
                          <span className="text-amber-700/80">{b.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Redeem Coupon Card */}
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Have a Promotion Code?</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Enter your promotional coupon code to instantly unlock bonus AI credits, extra channel slots, or feature upgrades.
                </p>

                <form onSubmit={handleRedeemCoupon} className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="ENTER CODE (e.g. LAUNCH2026)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono font-bold uppercase tracking-wider text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={redeeming || !couponCode.trim()}
                    className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {redeeming ? "Verifying..." : "Apply Coupon"}
                  </button>
                </form>

                {couponFeedback && (
                  <div
                    className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      couponFeedback.type === "success"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {couponFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{couponFeedback.msg}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helpers
const ThemeButton = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 transition ${
      active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
    }`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const ToggleRow = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <div className="flex flex-col pr-4">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-xs text-slate-500 leading-snug">{desc}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-slate-200"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  </div>
);
