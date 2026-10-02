import type { Response, NextFunction } from "express";
import { accountRepository } from "../repositories/accountRepository.js";
import { tokenService } from "../services/tokenService.js";
import { AccountNotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export const getAccounts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId || "default-workspace";
    const accounts = await accountRepository.getAllAccounts(workspaceId);
    res.json(accounts);
  } catch (err) {
    next(err);
  }
};

export const getAccountById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const workspaceId = req.workspaceId || "default-workspace";
    const account = await accountRepository.getAccountById(id, workspaceId);
    if (!account) {
      throw new AccountNotFoundError(id);
    }
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

export const refreshAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const workspaceId = req.workspaceId || "default-workspace";
    const accountWithTokens = await accountRepository.getAccountWithTokens(id, workspaceId);
    if (!accountWithTokens) {
      throw new AccountNotFoundError(id);
    }

    await tokenService.ensureValidToken(accountWithTokens);
    res.json({ success: true, message: "Account token refreshed successfully." });
  } catch (err) {
    next(err);
  }
};

export const disconnectAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const workspaceId = req.workspaceId || "default-workspace";
    const deleted = await accountRepository.deleteAccount(id, workspaceId);
    if (!deleted) {
      throw new AccountNotFoundError(id);
    }
    res.json({ success: true, message: "Account disconnected successfully." });
  } catch (err) {
    next(err);
  }
};
