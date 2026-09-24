import type { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service.js';

export class ReportController {
  static async getCasePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caseId = req.params.caseId;
      const pdfBuffer = await ReportService.generateCasePdf(caseId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="curify-dossier-${caseId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
}
