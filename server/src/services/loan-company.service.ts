import { query } from '../config/database.js';

export class LoanCompanyService {
  async getCompanies() {
    const result = await query(`SELECT * FROM loan_companies ORDER BY name ASC`);
    return result.rows;
  }

  async createCompany(data: any) {
    const { name, logo_url, company_type, min_interest_rate, max_interest_rate, max_loan_amount, min_loan_amount, avg_processing_days, eligibility_rules, rating } = data;
    const result = await query(
      `INSERT INTO loan_companies (name, logo_url, company_type, min_interest_rate, max_interest_rate, max_loan_amount, min_loan_amount, avg_processing_days, eligibility_rules, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10) RETURNING *`,
      [name, logo_url || null, company_type || 'NBFC', min_interest_rate, max_interest_rate, max_loan_amount, min_loan_amount || 10000, avg_processing_days || 3, JSON.stringify(eligibility_rules || {}), rating || 4.0]
    );
    return result.rows[0];
  }

  async updateCompany(id: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [k, v] of Object.entries(data)) {
      if (k === 'id') continue;
      fields.push(`${k} = $${idx++}`);
      values.push(k === 'eligibility_rules' ? JSON.stringify(v) : v);
    }
    values.push(id);
    
    if (fields.length === 0) return null;

    const result = await query(
      `UPDATE loan_companies SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async getCompanyPerformance(id: string) {
    const offersRes = await query(`SELECT status FROM loan_offers WHERE company_id = $1`, [id]);
    const offers = offersRes.rows;
    
    const total = offers.length;
    const approved = offers.filter((o: any) => o.status === 'Approved').length;
    
    const companyRes = await query(`SELECT avg_processing_days FROM loan_companies WHERE id = $1`, [id]);
    const avgTat = companyRes.rows[0]?.avg_processing_days || 0;

    return {
      totalCases: total,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      avgTatDays: avgTat
    };
  }
}

export const loanCompanyService = new LoanCompanyService();
