import { authenticatedFetch } from "./apiClient";

const API_BASE = "http://localhost:4000/api";

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalWorkspaces: number;
  paidUsers: number;
  freeUsers: number;
  totalPlans: number;
  totalCoupons: number;
  totalBenefitsGranted: number;
  totalAuditLogs: number;
  billingStatus: string;
  billingNote: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  primaryWorkspaceId: string;
  saasRole?: "user" | "saas_admin";
  status?: "active" | "suspended";
  userPlan?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDefinition {
  id: string;
  name: string;
  description: string;
  active: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  maxSocialAccounts: number;
  maxPosts: number;
  maxScheduledPosts: number;
  maxAiGenerations: number;
  maxStorageMB: number;
  featureFlags: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponDefinition {
  id: string;
  code: string;
  description: string;
  active: boolean;
  discountType: "percentage" | "fixed" | "free_days" | "feature_unlock" | "plan_upgrade";
  discountValue: number;
  benefitType?: "extra_ai" | "extra_accounts" | "extra_posts" | "free_days" | "feature_unlock" | "plan_upgrade";
  benefitValue?: number;
  startsAt?: string;
  expiresAt?: string;
  usageLimit: number;
  redeemedCount: number;
  perUserLimit: number;
  oneTime: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserBenefit {
  id: string;
  userId: string;
  workspaceId?: string;
  type: "extra_ai" | "extra_accounts" | "extra_posts" | "free_days" | "feature_unlock" | "plan_upgrade";
  value: number | string;
  reason: string;
  active: boolean;
  startsAt: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  revokedAt?: string;
}

export interface AdminAuditRecord {
  id: string;
  actorAdminId: string;
  actorAdminEmail: string;
  targetUserId?: string;
  targetWorkspaceId?: string;
  action: string;
  details: Record<string, any>;
  result: "SUCCESS" | "FAILED";
  timestamp: string;
}

export interface EffectiveEntitlements {
  plan: PlanDefinition;
  maxSocialAccounts: number;
  maxPosts: number;
  maxScheduledPosts: number;
  maxAiGenerations: number;
  maxStorageMB: number;
  featureFlags: Record<string, boolean>;
  activeBenefits: UserBenefit[];
}

class AdminApiService {
  public async getDashboardMetrics(): Promise<{ metrics: AdminMetrics; recentAuditLogs: AdminAuditRecord[] }> {
    const res = await authenticatedFetch(`${API_BASE}/admin/dashboard`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch admin metrics");
    }
    return res.json();
  }

  public async getUsers(params?: { search?: string; status?: string; plan?: string; role?: string }): Promise<UserProfile[]> {
    const query = new URLSearchParams(params as any).toString();
    const url = `${API_BASE}/admin/users${query ? `?${query}` : ""}`;
    const res = await authenticatedFetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch users");
    }
    const data = await res.json();
    return data.users || [];
  }

  public async getUserDetail(userId: string): Promise<{ user: UserProfile; entitlements: EffectiveEntitlements; benefits: UserBenefit[] }> {
    const res = await authenticatedFetch(`${API_BASE}/admin/users/${userId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch user details");
    }
    return res.json();
  }

  public async suspendUser(userId: string, reason?: string): Promise<UserProfile> {
    const res = await authenticatedFetch(`${API_BASE}/admin/users/${userId}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to suspend user");
    }
    const data = await res.json();
    return data.user;
  }

  public async activateUser(userId: string): Promise<UserProfile> {
    const res = await authenticatedFetch(`${API_BASE}/admin/users/${userId}/activate`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to activate user");
    }
    const data = await res.json();
    return data.user;
  }

  public async updateUserPlan(userId: string, planId: string): Promise<UserProfile> {
    const res = await authenticatedFetch(`${API_BASE}/admin/users/${userId}/plan`, {
      method: "POST",
      body: JSON.stringify({ planId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update user plan");
    }
    const data = await res.json();
    return data.user;
  }

  public async getPlans(): Promise<PlanDefinition[]> {
    const res = await authenticatedFetch(`${API_BASE}/admin/plans`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch plans");
    }
    const data = await res.json();
    return data.plans || [];
  }

  public async savePlan(plan: PlanDefinition): Promise<PlanDefinition> {
    const res = await authenticatedFetch(`${API_BASE}/admin/plans`, {
      method: "POST",
      body: JSON.stringify(plan),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to save plan");
    }
    const data = await res.json();
    return data.plan;
  }

  public async getCoupons(): Promise<CouponDefinition[]> {
    const res = await authenticatedFetch(`${API_BASE}/admin/coupons`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch coupons");
    }
    const data = await res.json();
    return data.coupons || [];
  }

  public async createCoupon(couponData: Partial<CouponDefinition>): Promise<CouponDefinition> {
    const res = await authenticatedFetch(`${API_BASE}/admin/coupons`, {
      method: "POST",
      body: JSON.stringify(couponData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create coupon");
    }
    const data = await res.json();
    return data.coupon;
  }

  public async toggleCouponActive(couponId: string, active: boolean): Promise<CouponDefinition> {
    const res = await authenticatedFetch(`${API_BASE}/admin/coupons/${couponId}`, {
      method: "PUT",
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update coupon status");
    }
    const data = await res.json();
    return data.coupon;
  }

  public async getBenefits(): Promise<UserBenefit[]> {
    const res = await authenticatedFetch(`${API_BASE}/admin/benefits`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch benefits");
    }
    const data = await res.json();
    return data.benefits || [];
  }

  public async grantBenefit(payload: { userId: string; type: string; value: number | string; reason: string; expiresAt?: string }): Promise<UserBenefit> {
    const res = await authenticatedFetch(`${API_BASE}/admin/benefits`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to grant benefit");
    }
    const data = await res.json();
    return data.benefit;
  }

  public async revokeBenefit(benefitId: string): Promise<UserBenefit> {
    const res = await authenticatedFetch(`${API_BASE}/admin/benefits/${benefitId}/revoke`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to revoke benefit");
    }
    const data = await res.json();
    return data.benefit;
  }

  public async getAuditLogs(): Promise<AdminAuditRecord[]> {
    const res = await authenticatedFetch(`${API_BASE}/admin/audit`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch audit logs");
    }
    const data = await res.json();
    return data.logs || [];
  }

  // --- CUSTOMER PROMOTIONS & ENTITLEMENTS ---
  public async redeemCoupon(code: string): Promise<{ message: string; benefit?: UserBenefit }> {
    const res = await authenticatedFetch(`${API_BASE}/coupons/redeem`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to redeem coupon");
    }
    return res.json();
  }

  public async getMyEntitlements(): Promise<{ userStatus: string; saasRole: string; entitlements: EffectiveEntitlements }> {
    const res = await authenticatedFetch(`${API_BASE}/entitlements/me`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch user entitlements");
    }
    return res.json();
  }
}

export const adminApi = new AdminApiService();
