import { query } from '../config/database.js';

export class LoanOfferService {
  async getOffersByCaseId(caseId: string) {
    const result = await query(
      `SELECT o.*, c.name as company_name, c.logo_url as company_logo 
       FROM loan_offers o
       JOIN loan_companies c ON o.company_id = c.id
       WHERE o.case_id = $1 
       ORDER BY o.interest_rate ASC`,
      [caseId]
    );
    return result.rows;
  }

  async getEligibleCompanies(caseId: string) {
    // Basic implementation: return all active companies that cover the requested amount
    const caseRes = await query(`SELECT requested_amount, patient_id FROM loan_cases WHERE id = $1`, [caseId]);
    if (caseRes.rowCount === 0) return [];
    
    const { requested_amount } = caseRes.rows[0];
    
    const result = await query(
      `SELECT * FROM loan_companies 
       WHERE is_active = true 
       AND min_loan_amount <= $1 
       AND max_loan_amount >= $1`,
      [requested_amount]
    );
    return result.rows;
  }

  async createOffers(caseId: string, companyIds: string[]) {
    // Get case details to generate realistic mock offers
    const caseRes = await query(`SELECT requested_amount FROM loan_cases WHERE id = $1`, [caseId]);
    if (caseRes.rowCount === 0) throw new Error('Case not found');
    const { requested_amount } = caseRes.rows[0];

    const companiesRes = await query(`SELECT id, min_interest_rate, max_interest_rate FROM loan_companies WHERE id = ANY($1)`, [companyIds]);
    
    const offers = [];
    for (const company of companiesRes.rows) {
      // Mock random interest rate within company range
      const rate = company.min_interest_rate + Math.random() * (company.max_interest_rate - company.min_interest_rate);
      
      const result = await query(
        `INSERT INTO loan_offers (case_id, company_id, offered_amount, interest_rate, tenure_months, processing_fee, status, sent_at)
         VALUES ($1, $2, $3, $4, 12, 1000, 'Sent to Patient', CURRENT_TIMESTAMP) RETURNING *`,
        [caseId, company.id, requested_amount, Number(rate.toFixed(1))]
      );
      offers.push(result.rows[0]);
    }
    
    // Update case stage
    await query(`UPDATE loan_cases SET broker_stage = 'Awaiting Patient Selection' WHERE id = $1`, [caseId]);
    
    return offers;
  }

  async selectOffer(offerId: string, caseId: string) {
    // Patient selects an offer
    await query(`UPDATE loan_offers SET status = 'Selected by Patient', decided_at = CURRENT_TIMESTAMP WHERE id = $1`, [offerId]);
    await query(`UPDATE loan_offers SET status = 'Declined' WHERE case_id = $1 AND id != $2`, [caseId, offerId]);
    
    const result = await query(
      `UPDATE loan_cases SET selected_offer_id = $1, broker_stage = 'Company Underwriting' WHERE id = $2 RETURNING *`,
      [offerId, caseId]
    );
    return result.rows[0];
  }

  async updateOfferDecision(offerId: string, status: string, caseId: string) {
    // Lender updates final status
    await query(`UPDATE loan_offers SET status = $1, decided_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, offerId]);
    
    if (status === 'Approved') {
      const offerRes = await query(`SELECT offered_amount FROM loan_offers WHERE id = $1`, [offerId]);
      await query(
        `UPDATE loan_cases SET broker_stage = 'Disbursed', disbursed_amount = $1, disbursal_date = CURRENT_DATE, status = 'Approved' WHERE id = $2 RETURNING *`,
        [offerRes.rows[0].offered_amount, caseId]
      );
    } else if (status === 'Declined' || status === 'Rejected') {
      await query(
        `UPDATE loan_cases SET broker_stage = 'Rejected', status = 'Rejected' WHERE id = $1 RETURNING *`,
        [caseId]
      );
    }
    
    return { success: true };
  }
}

export const loanOfferService = new LoanOfferService();
