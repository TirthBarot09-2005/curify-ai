import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Allow users to view/download case PDFs (authenticates if header/cookie provided)
router.get('/:caseId/pdf', optionalAuth, ReportController.getCasePdf);

export default router;
