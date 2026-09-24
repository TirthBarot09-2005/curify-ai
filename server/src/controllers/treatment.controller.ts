import type { Request, Response, NextFunction } from 'express';
import { TreatmentService } from '../services/treatment.service.js';

export class TreatmentController {
  static async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await TreatmentService.createPlan({
        patientId: req.user!.id,
        clinicalMappingId: req.body.clinicalMappingId,
        hospitalId: req.body.hospitalId,
        costBreakdown: req.body.costBreakdown,
        status: req.body.status,
      });

      res.status(201).json({
        success: true,
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await TreatmentService.getPlansByPatient(req.user!.id);
      res.json({
        success: true,
        data: plans,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await TreatmentService.getPlanById(req.params.id);
      res.json({
        success: true,
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }

  static async finalizePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await TreatmentService.finalizePlan(req.params.id);
      res.json({
        success: true,
        message: 'Treatment plan finalized',
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }
}
