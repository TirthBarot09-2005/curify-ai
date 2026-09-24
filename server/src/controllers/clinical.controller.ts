import type { Request, Response, NextFunction } from 'express';
import { clinicalService } from '../services/clinical.service.js';
import { getQuota } from '../services/quota.service.js';

export class ClinicalController {
  static async getQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quota = await getQuota(req.user!.id);
      res.json({
        success: true,
        data: quota,
      });
    } catch (err) {
      next(err);
    }
  }

  static async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, age, gender, city, comorbidities, budget } = req.body;
      
      const result = await clinicalService.analyze({
        patientId: req.user!.id,
        query: query || 'Total knee replacement surgery',
        age: age ? Number(age) : undefined,
        gender,
        city,
        comorbidities: Array.isArray(comorbidities) ? comorbidities : (typeof comorbidities === 'string' && comorbidities ? [comorbidities] : []),
        budget: budget ? Number(budget) : undefined,
      });

      res.json({
        success: true,
        data: {
          ...result,
          quota: { used: (req as any).quotaUsed ?? null, limit: (req as any).quotaLimit ?? null }
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
