import type { Request, Response, NextFunction } from 'express';
import { HospitalService } from '../services/hospital.service.js';

export class HospitalController {
  static async getHospitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { city, accreditation, minRating, sort } = req.query;
      const hospitals = await HospitalService.getHospitals({
        city: city as string,
        accreditation: accreditation as string,
        minRating: minRating ? Number(minRating) : undefined,
        sort: sort as string,
      });

      res.json({
        success: true,
        data: hospitals,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getHospitalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await HospitalService.getHospitalById(req.params.id);
      res.json({
        success: true,
        data: hospital,
      });
    } catch (err) {
      next(err);
    }
  }

  static async matchHospitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mappingId, city, budget, targetProcedure, category } = req.body;
      const matches = await HospitalService.matchHospitals(
        mappingId,
        city || 'Ahmedabad',
        budget ? Number(budget) : 180000,
        targetProcedure,
        category
      );

      res.json({
        success: true,
        data: matches,
      });
    } catch (err) {
      next(err);
    }
  }
}
