import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { workspaceService } from "../services/workspaceService.js";
import { entitlementService, type PlanDefinition, type CouponDefinition, type UserBenefit } from "../services/entitlementService.js";
import { adminAuditService } from "../services/adminAuditService.js";
import { AppError } from "../utils/errors.js";

export class AdminController {
  // --- DASHBOARD OVERVIEW ---
  public getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const users = await workspaceService.getAllUserProfiles();
      const plans = await entitlementService.getPlans();
      const coupons = await entitlementService.getCoupons();
      const benefits = await entitlementService.getBenefits();
      const auditLogs = await adminAuditService.getAuditLogs(50);

      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.status !== "suspended").length;
      const suspendedUsers = users.filter((u) => u.status === "suspended").length;
      const paidUsers = users.filter((u) => u.userPlan && u.userPlan !== "free").length;
      const freeUsers = totalUsers - paidUsers;

      res.json({
        success: true,
        metrics: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          totalWorkspaces: totalUsers, // 1:1 personal workspace model
          paidUsers,
          freeUsers,
          totalPlans: plans.length,
          totalCoupons: coupons.length,
          totalBenefitsGranted: benefits.length,
          totalAuditLogs: auditLogs.length,
          billingStatus: "BILLING INTEGRATION REQUIRED",
          billingNote: "Monetary payment processing requires external provider configuration (e.g., Stripe). Plans and coupons act as entitlement overrides.",
        },
        recentAuditLogs: auditLogs.slice(0, 10),
      });
    } catch (err) {
      next(err);
    }
  };

  // --- USERS MANAGEMENT ---
  public getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { search, status, plan, role } = req.query;
      let users = await workspaceService.getAllUserProfiles();

      if (search && typeof search === "string") {
        const q = search.toLowerCase();
        users = users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.displayName && u.displayName.toLowerCase().includes(q)) ||
            u.uid.toLowerCase().includes(q)
        );
      }

      if (status && typeof status === "string") {
        users = users.filter((u) => u.status === status);
      }

      if (plan && typeof plan === "string") {
        users = users.filter((u) => u.userPlan === plan);
      }

      if (role && typeof role === "string") {
        users = users.filter((u) => u.saasRole === role);
      }

      res.json({
        success: true,
        count: users.length,
        users,
      });
    } catch (err) {
      next(err);
    }
  };

  public getUserDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = String(req.params.userId);
      const user = await workspaceService.getUserProfile(userId);

      if (!user) {
        throw new AppError("User not found.", 404, "USER_NOT_FOUND");
      }

      const entitlements = await entitlementService.getUserEntitlements(userId, user.userPlan || "free");
      const benefits = await entitlementService.getBenefits(userId);

      res.json({
        success: true,
        user,
        entitlements,
        benefits,
      });
    } catch (err) {
      next(err);
    }
  };

  public suspendUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = String(req.params.userId);
      const { reason } = req.body;

      if (userId === req.userId) {
        throw new AppError("Admin cannot suspend their own account.", 400, "CANNOT_SUSPEND_SELF");
      }

      const updatedUser = await workspaceService.updateUserProfile(userId, { status: "suspended" });

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        targetUserId: userId,
        action: "USER_SUSPENDED",
        details: { reason: reason || "Admin suspended account" },
      });

      res.json({
        success: true,
        message: `User ${userId} has been suspended.`,
        user: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  };

  public activateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = String(req.params.userId);

      const updatedUser = await workspaceService.updateUserProfile(userId, { status: "active" });

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        targetUserId: userId,
        action: "USER_ACTIVATED",
        details: { message: "Account reactivated by admin" },
      });

      res.json({
        success: true,
        message: `User ${userId} has been reactivated.`,
        user: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateUserPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = String(req.params.userId);
      const { planId } = req.body;

      if (!planId) {
        throw new AppError("planId is required.", 400, "INVALID_PLAN");
      }

      const plan = await entitlementService.getPlan(planId);
      if (!plan) {
        throw new AppError(`Plan '${planId}' does not exist.`, 404, "PLAN_NOT_FOUND");
      }

      const updatedUser = await workspaceService.updateUserProfile(userId, { userPlan: planId });

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        targetUserId: userId,
        action: "PLAN_CHANGED",
        details: { newPlanId: planId, planName: plan.name },
      });

      res.json({
        success: true,
        message: `User plan updated to ${plan.name}.`,
        user: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  };

  // --- PLANS ---
  public getPlans = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const plans = await entitlementService.getPlans();
      res.json({ success: true, plans });
    } catch (err) {
      next(err);
    }
  };

  public savePlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const planData: PlanDefinition = req.body;
      if (!planData.id || !planData.name) {
        throw new AppError("Plan ID and Name are required.", 400, "INVALID_PLAN_DATA");
      }

      const saved = await entitlementService.savePlan(planData);

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        action: "PLAN_SAVED",
        details: { planId: saved.id, name: saved.name },
      });

      res.json({ success: true, plan: saved });
    } catch (err) {
      next(err);
    }
  };

  // --- COUPONS ---
  public getCoupons = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const coupons = await entitlementService.getCoupons();
      res.json({ success: true, coupons });
    } catch (err) {
      next(err);
    }
  };

  public createCoupon = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { code, description, discountType, discountValue, benefitType, benefitValue, usageLimit, perUserLimit, startsAt, expiresAt } = req.body;

      if (!code) {
        throw new AppError("Coupon code is required.", 400, "MISSING_COUPON_CODE");
      }

      const couponId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newCoupon: CouponDefinition = {
        id: couponId,
        code: code.trim().toUpperCase(),
        description: description || "Promotional Coupon",
        active: true,
        discountType: discountType || "percentage",
        discountValue: Number(discountValue) || 0,
        benefitType: benefitType || "extra_ai",
        benefitValue: Number(benefitValue) || 10,
        usageLimit: Number(usageLimit) || 0,
        redeemedCount: 0,
        perUserLimit: Number(perUserLimit) || 1,
        oneTime: true,
        startsAt,
        expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await entitlementService.saveCoupon(newCoupon);

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        action: "COUPON_CREATED",
        details: { couponId: saved.id, code: saved.code },
      });

      res.json({ success: true, coupon: saved });
    } catch (err) {
      next(err);
    }
  };

  public toggleCouponActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const couponId = String(req.params.couponId);
      const { active } = req.body;

      const coupons = await entitlementService.getCoupons();
      const existing = coupons.find((c) => c.id === couponId);
      if (!existing) {
        throw new AppError("Coupon not found.", 404, "COUPON_NOT_FOUND");
      }

      existing.active = Boolean(active);
      const saved = await entitlementService.saveCoupon(existing);

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        action: "COUPON_UPDATED",
        details: { couponId, active: saved.active },
      });

      res.json({ success: true, coupon: saved });
    } catch (err) {
      next(err);
    }
  };

  // --- BENEFITS ---
  public getBenefits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const benefits = await entitlementService.getBenefits();
      res.json({ success: true, benefits });
    } catch (err) {
      next(err);
    }
  };

  public grantBenefit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, type, value, reason, expiresAt } = req.body;

      if (!userId || !type || value === undefined) {
        throw new AppError("userId, type, and value are required.", 400, "MISSING_BENEFIT_PARAMS");
      }

      const targetUser = await workspaceService.getUserProfile(userId);
      if (!targetUser) {
        throw new AppError("Target user not found.", 404, "USER_NOT_FOUND");
      }

      const benefit = await entitlementService.grantBenefit({
        userId,
        workspaceId: targetUser.primaryWorkspaceId,
        type,
        value,
        reason: reason || "Granted by SaaS Admin",
        expiresAt,
        createdBy: req.userId!,
      });

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        targetUserId: userId,
        action: "BENEFIT_GRANTED",
        details: { benefitId: benefit.id, type, value, reason },
      });

      res.json({ success: true, benefit });
    } catch (err) {
      next(err);
    }
  };

  public revokeBenefit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const benefitId = String(req.params.benefitId);

      const revoked = await entitlementService.revokeBenefit(benefitId, req.userId!);

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        targetUserId: revoked.userId,
        action: "BENEFIT_REVOKED",
        details: { benefitId },
      });

      res.json({ success: true, benefit: revoked });
    } catch (err) {
      next(err);
    }
  };

  // --- AUDIT LOGS ---
  public getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const logs = await adminAuditService.getAuditLogs(100);
      res.json({ success: true, logs });
    } catch (err) {
      next(err);
    }
  };

  // --- CUSTOMER PROMOTION ENDPOINT ---
  public redeemCoupon = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body;
      if (!code) {
        throw new AppError("Coupon code is required.", 400, "MISSING_CODE");
      }

      const result = await entitlementService.redeemCoupon(req.userId!, req.workspaceId!, code);

      await adminAuditService.logAction({
        actorAdminId: req.userId!,
        actorAdminEmail: req.userEmail!,
        targetUserId: req.userId,
        action: "COUPON_REDEEMED",
        details: { code, redemptionId: result.redemption.id },
      });

      res.json({
        success: true,
        message: "Coupon redeemed successfully!",
        redemption: result.redemption,
        benefit: result.benefit,
      });
    } catch (err) {
      next(err);
    }
  };

  // --- USER ENTITLEMENTS VIEW ---
  public getMyEntitlements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await workspaceService.getUserProfile(req.userId!);
      const userPlan = user?.userPlan || "free";
      const entitlements = await entitlementService.getUserEntitlements(req.userId!, userPlan);

      res.json({
        success: true,
        userStatus: req.userStatus || "active",
        saasRole: req.saasRole || "user",
        entitlements,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const adminController = new AdminController();
