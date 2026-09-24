import { Router } from 'express';
import { OnboardingController } from '../controllers/onboarding.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.get('/', authenticate, requireRole('patient'), OnboardingController.getState);
router.put('/', authenticate, requireRole('patient'), OnboardingController.updateState);

export default router;
