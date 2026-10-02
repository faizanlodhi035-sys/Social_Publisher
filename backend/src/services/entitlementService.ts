import { getFirestoreDb } from "../firebase/admin.js";
import { AppError } from "../utils/errors.js";

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
  createdAt: string;
  updatedAt: string;
}

export interface CouponDefinition {
  id: string;
  code: string;
  description: string;
  active: boolean;
  discountType: "percentage" | "fixed" | "free_days" | "feature_unlock" | "plan_upgrade";
  discountValue: number;
  appliesToPlan?: string;
  benefitType?: "extra_ai" | "extra_accounts" | "extra_posts" | "free_days" | "feature_unlock" | "plan_upgrade";
  benefitValue?: number;
  startsAt?: string;
  expiresAt?: string;
  usageLimit: number; // 0 = unlimited
  redeemedCount: number;
  perUserLimit: number;
  oneTime: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  code: string;
  userId: string;
  workspaceId: string;
  benefitResult: string;
  redeemedAt: string;
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

const DEFAULT_PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free Starter",
    description: "Essential social publishing features for personal channels",
    active: true,
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxSocialAccounts: 2,
    maxPosts: 20,
    maxScheduledPosts: 5,
    maxAiGenerations: 15,
    maxStorageMB: 50,
    featureFlags: { tiktokUpload: true, aiAssistant: true, analytics: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "basic",
    name: "Basic Growth",
    description: "Designed for active creators and small businesses",
    active: true,
    monthlyPrice: 19,
    yearlyPrice: 190,
    maxSocialAccounts: 5,
    maxPosts: 100,
    maxScheduledPosts: 25,
    maxAiGenerations: 100,
    maxStorageMB: 500,
    featureFlags: { tiktokUpload: true, aiAssistant: true, analytics: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "pro",
    name: "Pro Agency",
    description: "High-volume scheduling, advanced analytics, and priority queue",
    active: true,
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxSocialAccounts: 15,
    maxPosts: 500,
    maxScheduledPosts: 100,
    maxAiGenerations: 500,
    maxStorageMB: 2000,
    featureFlags: { tiktokUpload: true, aiAssistant: true, analytics: true, priorityPublishing: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "custom",
    name: "Custom Enterprise",
    description: "Tailored entitlements and dedicated support",
    active: true,
    monthlyPrice: 149,
    yearlyPrice: 1490,
    maxSocialAccounts: 50,
    maxPosts: 2000,
    maxScheduledPosts: 500,
    maxAiGenerations: 2000,
    maxStorageMB: 10000,
    featureFlags: { tiktokUpload: true, aiAssistant: true, analytics: true, priorityPublishing: true, customBranding: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-memory fallbacks for development without live GCP credentials
const localPlans = new Map<string, PlanDefinition>(DEFAULT_PLANS.map((p) => [p.id, p]));
const localCoupons = new Map<string, CouponDefinition>();
const localRedemptions = new Map<string, CouponRedemption>();
const localBenefits = new Map<string, UserBenefit>();

export class EntitlementService {
  // --- PLANS ---
  public async getPlans(): Promise<PlanDefinition[]> {
    const db = getFirestoreDb();
    if (db) {
      try {
        const snapshot = await db.collection("plans").get();
        if (!snapshot.empty) {
          return snapshot.docs.map((doc) => doc.data() as PlanDefinition);
        }
      } catch {
        // fallback
      }
    }
    return Array.from(localPlans.values());
  }

  public async getPlan(planId: string): Promise<PlanDefinition | null> {
    const plans = await this.getPlans();
    return plans.find((p) => p.id === planId) || localPlans.get(planId) || null;
  }

  public async savePlan(plan: PlanDefinition): Promise<PlanDefinition> {
    const db = getFirestoreDb();
    const now = new Date().toISOString();
    const payload = { ...plan, updatedAt: now };

    if (db) {
      try {
        await db.collection("plans").doc(plan.id).set(payload, { merge: true });
        return payload;
      } catch (err) {
        console.warn("[EntitlementService] Firestore savePlan error, fallback:", err);
      }
    }
    localPlans.set(plan.id, payload);
    return payload;
  }

  // --- COUPONS ---
  public async getCoupons(): Promise<CouponDefinition[]> {
    const db = getFirestoreDb();
    if (db) {
      try {
        const snapshot = await db.collection("coupons").get();
        return snapshot.docs.map((doc) => doc.data() as CouponDefinition);
      } catch {
        // fallback
      }
    }
    return Array.from(localCoupons.values());
  }

  public async getCouponByCode(code: string): Promise<CouponDefinition | null> {
    const normalizedCode = code.trim().toUpperCase();
    const coupons = await this.getCoupons();
    return coupons.find((c) => c.code === normalizedCode) || null;
  }

  public async saveCoupon(coupon: CouponDefinition): Promise<CouponDefinition> {
    const db = getFirestoreDb();
    const now = new Date().toISOString();
    const payload = { ...coupon, code: coupon.code.toUpperCase(), updatedAt: now };

    if (db) {
      try {
        await db.collection("coupons").doc(coupon.id).set(payload, { merge: true });
        return payload;
      } catch (err) {
        console.warn("[EntitlementService] Firestore saveCoupon error, fallback:", err);
      }
    }
    localCoupons.set(coupon.id, payload);
    return payload;
  }

  public async redeemCoupon(userId: string, workspaceId: string, code: string): Promise<{ redemption: CouponRedemption; benefit?: UserBenefit }> {
    const coupon = await this.getCouponByCode(code);
    if (!coupon) {
      throw new AppError("Invalid coupon code.", 404, "COUPON_NOT_FOUND");
    }

    if (!coupon.active) {
      throw new AppError("Coupon is no longer active.", 400, "COUPON_INACTIVE");
    }

    const now = new Date().toISOString();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new AppError("Coupon is not yet valid.", 400, "COUPON_NOT_STARTED");
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new AppError("Coupon has expired.", 400, "COUPON_EXPIRED");
    }

    if (coupon.usageLimit > 0 && coupon.redeemedCount >= coupon.usageLimit) {
      throw new AppError("Coupon maximum usage limit has been reached.", 400, "COUPON_LIMIT_REACHED");
    }

    const redemptionId = `${coupon.id}_${userId}`;
    const db = getFirestoreDb();

    if (db) {
      try {
        const redemptionRef = db.collection("couponRedemptions").doc(redemptionId);
        const existingDoc = await redemptionRef.get();
        if (existingDoc.exists) {
          throw new AppError("Coupon has already been redeemed by this user.", 400, "COUPON_ALREADY_REDEEMED");
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
      }
    } else if (localRedemptions.has(redemptionId)) {
      throw new AppError("Coupon has already been redeemed by this user.", 400, "COUPON_ALREADY_REDEEMED");
    }

    // Process benefit payload
    let grantedBenefit: UserBenefit | undefined;
    const benefitType = coupon.benefitType || "extra_ai";
    const benefitValue = coupon.benefitValue || coupon.discountValue || 10;

    if (coupon.discountType === "free_days" || benefitType) {
      grantedBenefit = await this.grantBenefit({
        userId,
        workspaceId,
        type: benefitType,
        value: benefitValue,
        reason: `Coupon promotion: ${coupon.code}`,
        active: true,
        startsAt: now,
        createdBy: "system_coupon",
      });
    }

    const redemption: CouponRedemption = {
      id: redemptionId,
      couponId: coupon.id,
      code: coupon.code,
      userId,
      workspaceId,
      benefitResult: `Granted ${benefitType}: ${benefitValue}`,
      redeemedAt: now,
    };

    // Increment coupon redemption count
    coupon.redeemedCount = (coupon.redeemedCount || 0) + 1;
    await this.saveCoupon(coupon);

    if (db) {
      try {
        await db.collection("couponRedemptions").doc(redemptionId).set(redemption);
      } catch (err) {
        console.warn("[EntitlementService] Firestore save redemption error:", err);
      }
    }
    localRedemptions.set(redemptionId, redemption);

    return { redemption, benefit: grantedBenefit };
  }

  // --- BENEFITS ---
  public async getBenefits(userId?: string): Promise<UserBenefit[]> {
    const db = getFirestoreDb();
    if (db) {
      try {
        let query: any = db.collection("benefits");
        if (userId) {
          query = query.where("userId", "==", userId);
        }
        const snapshot = await query.get();
        return snapshot.docs.map((doc: any) => doc.data() as UserBenefit);
      } catch {
        // fallback
      }
    }
    const all = Array.from(localBenefits.values());
    return userId ? all.filter((b) => b.userId === userId) : all;
  }

  public async grantBenefit(params: {
    userId: string;
    workspaceId?: string;
    type: UserBenefit["type"];
    value: number | string;
    reason: string;
    active?: boolean;
    startsAt?: string;
    expiresAt?: string;
    createdBy: string;
  }): Promise<UserBenefit> {
    const now = new Date().toISOString();
    const benefitId = `ben_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const benefit: UserBenefit = {
      id: benefitId,
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: params.type,
      value: params.value,
      reason: params.reason,
      active: params.active ?? true,
      startsAt: params.startsAt || now,
      expiresAt: params.expiresAt,
      createdBy: params.createdBy,
      createdAt: now,
    };

    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection("benefits").doc(benefitId).set(benefit);
      } catch (err) {
        console.warn("[EntitlementService] Firestore grantBenefit error, fallback:", err);
      }
    }
    localBenefits.set(benefitId, benefit);
    return benefit;
  }

  public async revokeBenefit(benefitId: string, adminUserId: string): Promise<UserBenefit> {
    const benefits = await this.getBenefits();
    const benefit = benefits.find((b) => b.id === benefitId) || localBenefits.get(benefitId);
    if (!benefit) {
      throw new AppError("Benefit not found.", 404, "BENEFIT_NOT_FOUND");
    }

    const now = new Date().toISOString();
    benefit.active = false;
    benefit.revokedAt = now;

    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection("benefits").doc(benefitId).update({ active: false, revokedAt: now });
      } catch (err) {
        console.warn("[EntitlementService] Firestore revokeBenefit error, fallback:", err);
      }
    }
    localBenefits.set(benefitId, benefit);
    return benefit;
  }

  // --- CENTRALIZED ENTITLEMENT RESOLVER ---
  /**
   * Deterministically calculates a user's effective entitlements:
   * Base Plan -> Active User Benefits -> Temporary Overrides -> Feature Restrictions
   */
  public async getUserEntitlements(userId: string, userPlanId = "free"): Promise<EffectiveEntitlements> {
    const plans = await this.getPlans();
    const basePlan = plans.find((p) => p.id === userPlanId) || localPlans.get("free") || DEFAULT_PLANS[0];

    const allBenefits = await this.getBenefits(userId);
    const now = new Date().toISOString();

    const activeBenefits = allBenefits.filter((b) => {
      if (!b.active) return false;
      if (b.startsAt && now < b.startsAt) return false;
      if (b.expiresAt && now > b.expiresAt) return false;
      return true;
    });

    let extraAi = 0;
    let extraAccounts = 0;
    let extraPosts = 0;
    const additionalFlags: Record<string, boolean> = {};

    for (const b of activeBenefits) {
      if (b.type === "extra_ai" && typeof b.value === "number") {
        extraAi += b.value;
      } else if (b.type === "extra_accounts" && typeof b.value === "number") {
        extraAccounts += b.value;
      } else if (b.type === "extra_posts" && typeof b.value === "number") {
        extraPosts += b.value;
      } else if (b.type === "feature_unlock" && typeof b.value === "string") {
        additionalFlags[b.value] = true;
      }
    }

    return {
      plan: basePlan,
      maxSocialAccounts: basePlan.maxSocialAccounts + extraAccounts,
      maxPosts: basePlan.maxPosts + extraPosts,
      maxScheduledPosts: basePlan.maxScheduledPosts + extraPosts,
      maxAiGenerations: basePlan.maxAiGenerations + extraAi,
      maxStorageMB: basePlan.maxStorageMB,
      featureFlags: {
        ...basePlan.featureFlags,
        ...additionalFlags,
      },
      activeBenefits,
    };
  }
}

export const entitlementService = new EntitlementService();
