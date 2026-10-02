# PHASE 11 — SaaS Admin Panel, Plans, Coupons & User Benefits

## Overview
Phase 11 introduces a comprehensive **SaaS Owner / Admin Panel** and **Entitlements Architecture** to Social Publisher. It enables platform administrators to manage users, subscription tiers, promotional coupons, user-specific quota overrides, and audit trails while maintaining complete data isolation from customer workspaces.

---

## 1. SaaS Admin Architecture
- **Distinction**:
  - **SaaS Admin**: Superuser managing the entire multi-tenant SaaS application (`/admin/*`).
  - **Workspace Owner**: Customer managing their own isolated workspace (`/dashboard`).
  - **Workspace Member**: Team member working inside their assigned workspace.
- **Data Model**:
  - `users/{userId}` stores `saasRole: "user" | "saas_admin"`, `status: "active" | "suspended"`, and `userPlan: "free" | "basic" | "pro" | "custom"`.

---

## 2. Admin Authentication & Authorization
- **Server-Side Enforcement**:
  - `requireSaasAdmin` middleware verifies caller's SaaS Admin status.
  - Checks Firebase Admin Custom Claims (`saasRole === 'saas_admin'`) and the `users/{userId}` document in Firestore.
  - Client-side roles, localStorage parameters, or hidden buttons are **never** trusted.
- **Account Suspension**:
  - When `status === 'suspended'`, `requireAuth` rejects requests with `HTTP 403 Account Suspended`. User data and scheduled posts remain intact.

---

## 3. User Management
- **Routes**: `/admin/users`, `/admin/users/:userId`.
- **Capabilities**:
  - Search, filter by status, plan, and role.
  - Inspect user profile, primary workspace ID, and last activity timestamp.
  - Suspend and reactivate user accounts with mandatory reason logging.
  - Update user subscription plan.

---

## 4. Subscription Plans
- **Default Tiers**:
  - **Free Starter**: 2 social accounts, 20 posts/mo, 5 scheduled posts, 15 AI generations, 50MB storage.
  - **Basic Growth**: 5 social accounts, 100 posts/mo, 25 scheduled posts, 100 AI generations, 500MB storage.
  - **Pro Agency**: 15 social accounts, 500 posts/mo, 100 scheduled posts, 500 AI generations, 2000MB storage.
  - **Custom Enterprise**: 50 social accounts, 2000 posts/mo, 500 scheduled posts, 2000 AI generations, 10GB storage.
- **Storage**: Managed in Firestore `plans/{planId}` collection.

---

## 5. Entitlement Engine
- **Deterministic Resolution (`getUserEntitlements`)**:
  ```
  Base Plan Quotas
  + Active User Benefits (Extra AI / Extra Accounts / Extra Posts)
  + Promotional Overrides
  - Feature Restrictions
  = Effective Entitlements
  ```
- **Calculated Entitlements**: `maxSocialAccounts`, `maxPosts`, `maxScheduledPosts`, `maxAiGenerations`, `maxStorageMB`, and `featureFlags`.

---

## 6. Coupons & Promotions
- **Routes**: `/admin/coupons` for Admin management, `/api/coupons/redeem` for customer redemption.
- **Fields**: `code`, `description`, `active`, `benefitType`, `benefitValue`, `usageLimit`, `redeemedCount`, `startsAt`, `expiresAt`.

---

## 7. Coupon Redemption
- **Redemption Flow**:
  - Customer enters code in **Settings > Plans & Promotions**.
  - Server verifies: authenticated user, coupon active, valid dates, global usage limit, duplicate redemption check.
  - Uses idempotent key `couponId_userId` in `couponRedemptions` to prevent double-claiming.

---

## 8. User-Specific Benefits
- **Routes**: `/admin/benefits`, `/admin/users/:userId`.
- **Capabilities**:
  - Admin can grant isolated quota bonuses (`extra_ai`, `extra_accounts`, `extra_posts`, `free_days`, `feature_unlock`) without altering global base plan definitions.
  - Admins can revoke active benefits.

---

## 9. Usage Limits
- Centralized entitlement checking prevents quota overruns across AI tools, social account connections, and scheduled publishing.

---

## 10. Audit Logging
- **Collection**: `adminAuditLogs/{logId}`.
- **Tracked Actions**: `USER_SUSPENDED`, `USER_ACTIVATED`, `PLAN_CHANGED`, `PLAN_SAVED`, `COUPON_CREATED`, `COUPON_UPDATED`, `COUPON_REDEEMED`, `BENEFIT_GRANTED`, `BENEFIT_REVOKED`.
- **Immutability**: Write access denied to client SDKs (`allow write: if false;`). Written strictly via backend Admin SDK.

---

## 11. Firestore Collections
| Collection | Access Control | Purpose |
|------------|----------------|---------|
| `users` | Self or SaaS Admin | User profiles and SaaS roles |
| `plans` | Auth Read / Admin Write | Subscription tier definitions |
| `coupons` | Auth Read / Admin Write | Promotional coupon definitions |
| `couponRedemptions` | Self/Admin Read / Server Write | Idempotent redemption history |
| `benefits` | Self/Admin Read / Admin Write | User-specific entitlement overrides |
| `adminAuditLogs` | Admin Read / Server Write | System administration audit logs |

---

## 12. Firestore Rules
- Includes `isSaasAdmin()` helper function validating token claims or Firestore user profile doc.
- Enforces field diff protection on `users/{userId}` to prevent users from escalating their own `saasRole` or `status`.

---

## 13. API Endpoints
- `GET /api/admin/dashboard` — Platform overview metrics & recent logs
- `GET /api/admin/users` — List and search users
- `GET /api/admin/users/:userId` — Detailed user entitlements & profile
- `POST /api/admin/users/:userId/suspend` — Suspend user account
- `POST /api/admin/users/:userId/activate` — Reactivate user account
- `POST /api/admin/users/:userId/plan` — Change user plan
- `GET /api/admin/plans`, `POST /api/admin/plans`, `PUT /api/admin/plans/:planId` — Manage plans
- `GET /api/admin/coupons`, `POST /api/admin/coupons`, `PUT /api/admin/coupons/:couponId` — Manage coupons
- `GET /api/admin/benefits`, `POST /api/admin/benefits`, `POST /api/admin/benefits/:benefitId/revoke` — Manage benefits
- `GET /api/admin/audit` — Inspect admin audit log trail
- `POST /api/coupons/redeem` — Customer coupon redemption
- `GET /api/entitlements/me` — Customer effective entitlements view

---

## 14. Customer UI
- **Settings > Plans & Promotions**:
  - Displays current plan, effective limits, and active benefits.
  - Coupon redemption input box with real-time feedback.

---

## 15. Billing Boundary
- **STATUS**: `BILLING INTEGRATION REQUIRED`
- Payment processing requires an external provider (e.g. Stripe). Plans and coupons currently serve as internal entitlement definitions and promotional unlocks.

---

## 16. Firebase Deployment
- Security rules updated in `firestore.rules`.
- Firebase custom claims compatible for `saasRole`.

---

## 17. Admin Role Setup Instructions
To grant a user SaaS Admin privileges in production or dev:
1. Update document `users/{userId}` set `saasRole: "saas_admin"`.
2. (Optional) Set custom claim via Firebase Admin SDK: `admin.auth().setCustomUserClaims(uid, { saasRole: 'saas_admin' })`.

---

## 18. QA Results
- **Backend Build**: `npm run build` inside `backend` -> **PASS (0 TS errors)**.
- **Frontend Build**: `npm run build` in root workspace -> **PASS (0 TS errors)**.
- **Route Protection**: `/admin/*` rejects regular users and unauthenticated sessions -> **PASS**.
- **Cross-User Isolation**: Verified User A cannot read or modify User B's data or elevate roles -> **PASS**.

---

## 19. Known Limitations
- Real credit card processing requires attaching Stripe or similar payment gateway (`BILLING INTEGRATION REQUIRED`).
