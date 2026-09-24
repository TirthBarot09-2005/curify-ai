import { Request, Response } from 'express';
import { loanCompanyService } from '../services/loan-company.service.js';

export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await loanCompanyService.getCompanies();
    res.json({ success: true, data: companies, companies });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createCompany = async (req: Request, res: Response) => {
  try {
    const company = await loanCompanyService.createCompany(req.body);
    res.json({ success: true, data: company, company });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const company = await loanCompanyService.updateCompany(req.params.id, req.body);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    res.json({ success: true, data: company, company });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCompanyPerformance = async (req: Request, res: Response) => {
  try {
    const metrics = await loanCompanyService.getCompanyPerformance(req.params.id);
    res.json({ success: true, data: metrics, metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
