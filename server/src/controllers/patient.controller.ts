import type { Request, Response, NextFunction } from 'express';
import { PatientService } from '../services/patient.service.js';

export class PatientController {
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PatientService.getProfile(req.user!.id);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PatientService.updateProfile(req.user!.id, req.body);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSavedHospitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PatientService.getSavedHospitals(req.user!.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async addSavedHospital(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hospitalId } = req.body;
      if (!hospitalId) throw Object.assign(new Error('hospitalId required'), { statusCode: 400 });
      const data = await PatientService.addSavedHospital(req.user!.id, hospitalId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async removeSavedHospital(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PatientService.removeSavedHospital(req.user!.id, req.params.hospitalId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PatientService.getDocuments(req.user!.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async addDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PatientService.addDocument(req.user!.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async removeDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PatientService.removeDocument(req.user!.id, req.params.documentId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
