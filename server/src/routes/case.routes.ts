import { Router } from 'express';
import { CaseController } from '../controllers/case.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validation.js';
import {
  createCaseSchema,
  approveCaseSchema,
  rejectCaseSchema,
  reviewCaseSchema,
  addNoteSchema,
} from '../validators/case.validator.js';

const router = Router();

router.post('/', authenticate, requireRole('patient'), validate(createCaseSchema), CaseController.createCase);
router.get('/', authenticate, CaseController.getCases);
router.get('/:id', authenticate, CaseController.getCaseById);
router.get('/:id/audit', authenticate, CaseController.getAuditLogs);

// Case events (patient-facing notification timeline)
router.get('/:id/events', authenticate, CaseController.getCaseEvents);
router.get('/:id/events/stream', authenticate, CaseController.streamCaseEvents);

// Lender decision routes
router.post('/:id/approve', authenticate, requireRole('lender', 'admin'), validate(approveCaseSchema), CaseController.approveCase);
router.post('/:id/reject', authenticate, requireRole('lender', 'admin'), validate(rejectCaseSchema), CaseController.rejectCase);
router.post('/:id/review', authenticate, requireRole('lender', 'admin'), validate(reviewCaseSchema), CaseController.reviewCase);
router.post('/:id/notes', authenticate, requireRole('lender', 'admin'), validate(addNoteSchema), CaseController.addNote);

export default router;
