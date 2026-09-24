import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { getOffersByCaseId, getEligibleCompanies, createOffers, selectOffer, updateOfferDecision } from '../controllers/loan-offer.controller.js';

const router = Router();

router.get('/case/:caseId', requireAuth, getOffersByCaseId);
router.get('/case/:caseId/eligible-companies', requireAuth, requireRole(['lender', 'admin']), getEligibleCompanies);
router.post('/case/:caseId', requireAuth, requireRole(['lender', 'admin']), createOffers);
router.post('/:id/select', requireAuth, requireRole(['patient']), selectOffer);
router.post('/:id/decision', requireAuth, requireRole(['lender', 'admin']), updateOfferDecision);

export default router;
