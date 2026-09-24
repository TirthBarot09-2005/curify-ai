import { Router } from 'express';
import { LenderController } from '../controllers/lender.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.get('/profile', authenticate, requireRole('lender', 'admin'), LenderController.getProfile);
router.get('/dashboard', authenticate, requireRole('lender', 'admin'), LenderController.getDashboard);

export default router;
