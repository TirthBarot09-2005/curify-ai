import { Request, Response, NextFunction } from 'express';
import { incrementAndCheck } from '../services/quota.service.js';

export async function aiRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return next();
    }

    const quota = await incrementAndCheck(user.id);
    
    if (!quota.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Daily AI analysis limit reached. Resets tomorrow at midnight.',
        used: quota.used,
        limit: quota.limit
      });
    }

    (req as any).quotaUsed = quota.used;
    (req as any).quotaLimit = quota.limit;
    
    next();
  } catch (err: any) {
    console.error('[AI Quota] Error checking limit \u2014 failing open:', err.message);
    next();
  }
}
