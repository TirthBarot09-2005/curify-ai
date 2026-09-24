import { Request, Response } from 'express';
import { loanOfferService } from '../services/loan-offer.service.js';

export const getOffersByCaseId = async (req: Request, res: Response) => {
  try {
    const offers = await loanOfferService.getOffersByCaseId(req.params.caseId);
    res.json({ success: true, data: offers, offers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getEligibleCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await loanOfferService.getEligibleCompanies(req.params.caseId);
    res.json({ success: true, data: companies, companies });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createOffers = async (req: Request, res: Response) => {
  try {
    const { companyIds } = req.body;
    const offers = await loanOfferService.createOffers(req.params.caseId, companyIds);
    res.json({ success: true, data: offers, offers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const selectOffer = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.body;
    const caseData = await loanOfferService.selectOffer(req.params.id, caseId);
    res.json({ success: true, data: caseData, case: caseData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateOfferDecision = async (req: Request, res: Response) => {
  try {
    const { status, caseId } = req.body;
    await loanOfferService.updateOfferDecision(req.params.id, status, caseId);
    res.json({ success: true, data: { status } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
