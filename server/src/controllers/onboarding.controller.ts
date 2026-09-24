import type { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../services/onboarding.service.js';

export class OnboardingController {
  static async getState(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OnboardingService.getOnboardingState(req.user!.id);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateState(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OnboardingService.updateOnboarding(req.user!.id, req.body);
      res.json({
        success: true,
        message: 'Onboarding updated successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
