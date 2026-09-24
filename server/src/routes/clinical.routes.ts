import { Router } from 'express';
import { ClinicalController } from '../controllers/clinical.controller.js';
import { authenticate } from '../middleware/auth.js';
import { aiRateLimit } from '../middleware/aiRateLimit.js';

const router = Router();

router.get('/quota', authenticate, ClinicalController.getQuota);
router.post('/analyze', authenticate, aiRateLimit, ClinicalController.analyze);

export default router;
