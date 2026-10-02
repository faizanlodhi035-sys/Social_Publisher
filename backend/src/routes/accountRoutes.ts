import { Router } from "express";
import { disconnectAccount, getAccountById, getAccounts, refreshAccount } from "../controllers/accountController.js";

const router = Router();

router.get("/accounts", getAccounts);
router.get("/accounts/:id", getAccountById);
router.post("/accounts/:id/refresh", refreshAccount);
router.post("/accounts/:id/disconnect", disconnectAccount);
router.delete("/accounts/:id", disconnectAccount);

// Also alias for /social/accounts to maintain compatibility with legacy endpoint references
router.get("/social/accounts", getAccounts);
router.post("/social/:id/disconnect", disconnectAccount);
router.post("/social/:id/refresh", refreshAccount);

export default router;
