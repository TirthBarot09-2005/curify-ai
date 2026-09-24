import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.get('/profile', authenticate, requireRole('patient'), PatientController.getProfile);
router.put('/profile', authenticate, requireRole('patient'), PatientController.updateProfile);

router.get('/saved-hospitals', authenticate, requireRole('patient'), PatientController.getSavedHospitals);
router.post('/saved-hospitals', authenticate, requireRole('patient'), PatientController.addSavedHospital);
router.delete('/saved-hospitals/:hospitalId', authenticate, requireRole('patient'), PatientController.removeSavedHospital);

router.get('/documents', authenticate, requireRole('patient'), PatientController.getDocuments);
router.post('/documents', authenticate, requireRole('patient'), PatientController.addDocument);
router.delete('/documents/:documentId', authenticate, requireRole('patient'), PatientController.removeDocument);

export default router;
