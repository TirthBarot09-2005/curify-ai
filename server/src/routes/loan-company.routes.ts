import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { getCompanies, createCompany, updateCompany, getCompanyPerformance } from '../controllers/loan-company.controller.js';

const router = Router();

router.get('/', requireAuth, getCompanies);
router.post('/', requireAuth, requireRole(['lender', 'admin']), createCompany);
router.put('/:id', requireAuth, requireRole(['lender', 'admin']), updateCompany);
router.get('/:id/performance', requireAuth, requireRole(['lender', 'admin']), getCompanyPerformance);

export default router;
