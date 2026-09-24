import { Router } from 'express';
import { HospitalController } from '../controllers/hospital.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', HospitalController.getHospitals);
router.post('/match', HospitalController.matchHospitals);
router.get('/:id', HospitalController.getHospitalById);

export default router;
