import type { Request, Response, NextFunction } from 'express';
import { CaseService } from '../services/case.service.js';
import { CaseEventService } from '../services/case-event.service.js';
import { eventBus } from '../services/event-bus.service.js';
import { query } from '../config/database.js';

export class CaseController {
  static async createCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loanCase = await CaseService.createCase({
        patientId: req.user!.id,
        treatmentPlanId: req.body.treatmentPlanId,
        requestedAmount: Number(req.body.requestedAmount),
      });

      res.status(201).json({
        success: true,
        message: 'Financing case submitted successfully',
        data: loanCase,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { status, search } = req.query;

      // Patients only see their own cases; lenders see all
      const patientId = user.role === 'patient' ? user.id : undefined;

      const cases = await CaseService.getCases({
        status: status as string,
        search: search as string,
        patientId,
      });

      res.json({
        success: true,
        data: cases,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCaseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loanCase = await CaseService.getCaseById(req.params.id);
      
      // Ownership check: If caller is a patient, verify case belongs to them
      if (req.user!.role === 'patient') {
        const casePatientId = (loanCase as any)?.patientId || (loanCase as any)?.patient_id || (loanCase as any)?.patient?.id;
        if (casePatientId && casePatientId !== req.user!.id) {
          res.status(403).json({
            success: false,
            message: 'Forbidden. You do not have permission to access another patient\u2019s financing case.',
          });
          return;
        }
      }

      res.json({
        success: true,
        data: loanCase,
      });
    } catch (err) {
      next(err);
    }
  }

  static async approveCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { approvedAmount, decisionComment } = req.body;
      const loanCase = await CaseService.approveCase(
        req.params.id,
        req.user!.id,
        Number(approvedAmount),
        decisionComment
      );

      res.json({
        success: true,
        message: 'Case approved successfully',
        data: loanCase,
      });
    } catch (err) {
      next(err);
    }
  }

  static async rejectCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const loanCase = await CaseService.rejectCase(req.params.id, req.user!.id, reason);

      res.json({
        success: true,
        message: 'Case marked as rejected',
        data: loanCase,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reviewCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewNote } = req.body;
      const loanCase = await CaseService.reviewCase(req.params.id, req.user!.id, reviewNote);

      res.json({
        success: true,
        message: 'Case flagged for additional review',
        data: loanCase,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { note } = req.body;
      const loanCase = await CaseService.addNote(req.params.id, req.user!.id, note);

      res.json({
        success: true,
        message: 'Note added to case dossier',
        data: loanCase,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await CaseService.getAuditLogs(req.params.id);
      res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cases/:id/events — Fetch persistent case events (patient-facing timeline)
   */
  static async getCaseEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caseId = req.params.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseId);
      const caseRes = isUuid
        ? await query(`SELECT id, patient_id FROM loan_cases WHERE id = $1`, [caseId])
        : await query(`SELECT id, patient_id FROM loan_cases WHERE case_number = $1`, [caseId]);

      if (caseRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Case not found' });
        return;
      }

      if (req.user!.role === 'patient' && caseRes.rows[0].patient_id !== req.user!.id) {
        res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to view events for this case.' });
        return;
      }

      const events = await CaseEventService.getEventsByCaseId(caseRes.rows[0].id);
      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cases/:id/events/stream — SSE endpoint for real-time case updates
   *
   * Security: Verifies authenticated user owns the case before establishing stream.
   * Handles client disconnects cleanly to avoid memory leaks.
   */
  static async streamCaseEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const caseId = req.params.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseId);
      const caseRes = isUuid
        ? await query(`SELECT id, patient_id FROM loan_cases WHERE id = $1`, [caseId])
        : await query(`SELECT id, patient_id FROM loan_cases WHERE case_number = $1`, [caseId]);

      if (caseRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Case not found' });
        return;
      }

      // Patients can only stream their own cases; lenders can stream any (for admin monitoring)
      if (req.user!.role === 'patient' && caseRes.rows[0].patient_id !== req.user!.id) {
        res.status(403).json({ success: false, message: 'Forbidden. You cannot subscribe to another patient’s case events.' });
        return;
      }

      const resolvedCaseId = caseRes.rows[0].id;

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Send initial connection confirmation
      res.write(`data: ${JSON.stringify({ type: 'connected', caseId: resolvedCaseId })}\n\n`);

      // Keep-alive heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        res.write(`: heartbeat\n\n`);
      }, 30000);

      // Subscribe to case events via in-process event bus (listen on both resolved UUID and passed ID)
      const unsub1 = eventBus.subscribe(resolvedCaseId, (event) => {
        try {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {}
      });
      const unsub2 = caseId !== resolvedCaseId ? eventBus.subscribe(caseId, (event) => {
        try {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {}
      }) : () => {};

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(heartbeat);
        unsub1();
        unsub2();
      });

    } catch (err) {
      next(err);
    }
  }
}
