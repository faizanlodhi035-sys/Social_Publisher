export type ThemeMode = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";
export type DefaultPostStatus = "draft" | "scheduled";

export interface ProfileSettings {
  fullName: string;
  email: string;
  avatar: string;
  role: string;
  workspaceName: string;
  workspaceDescription: string;
  timezone: string;
}

export interface NotificationSettings {
  postPublished: boolean;
  postFailed: boolean;
  scheduledReminder: boolean;
  approvalReminder: boolean;
  draftReminder: boolean;
  weeklyAnalytics: boolean;
  performanceAlerts: boolean;
  accountIssues: boolean;
  securityAlerts: boolean;
}

export interface PublishingSettings {
  defaultPostStatus: DefaultPostStatus;
  timezone: string;
  defaultPostingTime: string;
  autoSaveDrafts: boolean;
  confirmBeforePublishing: boolean;
  autoAddFirstComment: boolean;
  linkPreview: boolean;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  density: Density;
  reduceAnimations: boolean;
  compactNavigation: boolean;
  confirmDestructiveActions: boolean;
}

export interface AccountSettings {
  twoFactorEnabled: boolean;
}
