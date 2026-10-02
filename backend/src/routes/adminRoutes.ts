import { Router } from "express";
import { requireAuth, requireSaasAdmin } from "../middleware/authMiddleware.js";
import { adminController } from "../controllers/adminController.js";

const router = Router();

// Customer Entitlements & Promotion routes
router.post("/coupons/redeem", requireAuth, adminController.redeemCoupon);
router.get("/entitlements/me", requireAuth, adminController.getMyEntitlements);

// SaaS Admin Panel routes (strictly require SaaS Admin role)
router.get("/admin/dashboard", requireAuth, requireSaasAdmin, adminController.getDashboard);

router.get("/admin/users", requireAuth, requireSaasAdmin, adminController.getUsers);
router.get("/admin/users/:userId", requireAuth, requireSaasAdmin, adminController.getUserDetail);
router.post("/admin/users/:userId/suspend", requireAuth, requireSaasAdmin, adminController.suspendUser);
router.post("/admin/users/:userId/activate", requireAuth, requireSaasAdmin, adminController.activateUser);
router.post("/admin/users/:userId/plan", requireAuth, requireSaasAdmin, adminController.updateUserPlan);

router.get("/admin/plans", requireAuth, requireSaasAdmin, adminController.getPlans);
router.post("/admin/plans", requireAuth, requireSaasAdmin, adminController.savePlan);
router.put("/admin/plans/:planId", requireAuth, requireSaasAdmin, adminController.savePlan);

router.get("/admin/coupons", requireAuth, requireSaasAdmin, adminController.getCoupons);
router.post("/admin/coupons", requireAuth, requireSaasAdmin, adminController.createCoupon);
router.put("/admin/coupons/:couponId", requireAuth, requireSaasAdmin, adminController.toggleCouponActive);

router.get("/admin/benefits", requireAuth, requireSaasAdmin, adminController.getBenefits);
router.post("/admin/benefits", requireAuth, requireSaasAdmin, adminController.grantBenefit);
router.post("/admin/benefits/:benefitId/revoke", requireAuth, requireSaasAdmin, adminController.revokeBenefit);

router.get("/admin/audit", requireAuth, requireSaasAdmin, adminController.getAuditLogs);

export default router;
