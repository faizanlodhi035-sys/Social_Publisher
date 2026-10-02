import type {
  ProfileSettings,
  NotificationSettings,
  PublishingSettings,
  AppearanceSettings,
  AccountSettings,
} from "../types/settings";

const KEYS = {
  profile: "social-publisher-profile-settings",
  notifications: "social-publisher-notification-settings",
  publishing: "social-publisher-publishing-settings",
  appearance: "social-publisher-appearance-settings",
  account: "social-publisher-account-settings",
};

export const defaultProfile: ProfileSettings = {
  fullName: "Demo User",
  email: "user@example.com",
  avatar: "",
  role: "Admin",
  workspaceName: "My Workspace",
  workspaceDescription: "Main publishing workspace",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

export const defaultNotifications: NotificationSettings = {
  postPublished: true,
  postFailed: true,
  scheduledReminder: true,
  approvalReminder: false,
  draftReminder: false,
  weeklyAnalytics: true,
  performanceAlerts: false,
  accountIssues: true,
  securityAlerts: true,
};

export const defaultPublishing: PublishingSettings = {
  defaultPostStatus: "draft",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  defaultPostingTime: "09:00",
  autoSaveDrafts: true,
  confirmBeforePublishing: true,
  autoAddFirstComment: false,
  linkPreview: true,
};

export const defaultAppearance: AppearanceSettings = {
  theme: "system",
  density: "comfortable",
  reduceAnimations: false,
  compactNavigation: false,
  confirmDestructiveActions: true,
};

export const defaultAccount: AccountSettings = {
  twoFactorEnabled: false,
};

const loadJSON = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save settings to ${key}`, e);
  }
};

export const settingsStorage = {
  getProfile: () => loadJSON<ProfileSettings>(KEYS.profile, defaultProfile),
  saveProfile: (data: ProfileSettings) => saveJSON(KEYS.profile, data),

  getNotifications: () => loadJSON<NotificationSettings>(KEYS.notifications, defaultNotifications),
  saveNotifications: (data: NotificationSettings) => saveJSON(KEYS.notifications, data),

  getPublishing: () => loadJSON<PublishingSettings>(KEYS.publishing, defaultPublishing),
  savePublishing: (data: PublishingSettings) => saveJSON(KEYS.publishing, data),

  getAppearance: () => loadJSON<AppearanceSettings>(KEYS.appearance, defaultAppearance),
  saveAppearance: (data: AppearanceSettings) => saveJSON(KEYS.appearance, data),

  getAccount: () => loadJSON<AccountSettings>(KEYS.account, defaultAccount),
  saveAccount: (data: AccountSettings) => saveJSON(KEYS.account, data),

  resetAll: () => {
    localStorage.removeItem(KEYS.profile);
    localStorage.removeItem(KEYS.notifications);
    localStorage.removeItem(KEYS.publishing);
    localStorage.removeItem(KEYS.appearance);
    localStorage.removeItem(KEYS.account);
  }
};
