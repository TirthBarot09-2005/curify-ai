import { Router } from 'express';
import { TreatmentController } from '../controllers/treatment.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, TreatmentController.createPlan);
router.get('/', authenticate, TreatmentController.getPlans);
router.get('/:id', authenticate, TreatmentController.getPlanById);
router.put('/:id/finalize', authenticate, TreatmentController.finalizePlan);

export default router;
