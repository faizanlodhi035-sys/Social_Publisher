import type { Request, Response, NextFunction } from "express";
import { engagementRepository } from "../repositories/engagementRepository.js";

export const getAnalyticsOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.query.platform as string | undefined;
    const analytics = await engagementRepository.getAggregatedAnalytics(platform);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
};

export const getAnalyticsPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.query.platform as string | undefined;
    const snapshots = await engagementRepository.getSnapshots(platform);
    res.json({ success: true, data: snapshots });
  } catch (err) {
    next(err);
  }
};

export const getAnalyticsPlatforms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await engagementRepository.getAggregatedAnalytics();
    res.json({ success: true, data: analytics.platforms });
  } catch (err) {
    next(err);
  }
};
