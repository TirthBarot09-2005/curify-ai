import type { Request, Response, NextFunction } from 'express';
import { LenderService } from '../services/lender.service.js';

export class LenderController {
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await LenderService.getProfile(req.user!.id);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await LenderService.getDashboardMetrics();
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
