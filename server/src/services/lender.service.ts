import { query } from '../config/database.js';

export class LenderService {
  static async getProfile(userId: string) {
    const res = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              l.organization_name, l.designation, l.employee_id, l.created_at
       FROM users u
       LEFT JOIN lender_profiles l ON l.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (res.rowCount === 0) {
      const err: any = new Error('Lender not found');
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }

  static async getDashboardMetrics() {
    const casesRes = await query(`SELECT broker_stage, status, requested_amount, disbursed_amount, risk_score, created_at FROM loan_cases`);
    const cases = casesRes.rows;
    
    const metrics = {
      total_cases: cases.length,
      pending_review: cases.filter((c: any) => ['Company Underwriting', 'Awaiting Patient Selection', 'Intake'].includes(c.broker_stage) || c.status === 'Pending Review').length,
      approved: cases.filter((c: any) => c.broker_stage === 'Disbursed' || c.status === 'Approved').length,
      needs_review: cases.filter((c: any) => c.status === 'Needs Review').length,
      rejected: cases.filter((c: any) => c.broker_stage === 'Rejected' || c.status === 'Rejected').length,
      total_approved_amount: cases.filter((c: any) => c.broker_stage === 'Disbursed' || c.status === 'Approved').reduce((acc: number, c: any) => acc + (c.disbursed_amount || c.requested_amount || 0), 0),
      average_risk_score: cases.length ? cases.reduce((acc: number, c: any) => acc + (c.risk_score || 0), 0) / cases.length : 0
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const cashflowMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      cashflowMap[`${monthNames[d.getMonth()]} ${d.getFullYear()}`] = 0;
    }
    
    for (const c of cases) {
      if (c.broker_stage === 'Disbursed' || c.status === 'Approved') {
        const d = new Date(c.created_at);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (cashflowMap[key] !== undefined) {
          cashflowMap[key] += (c.disbursed_amount || c.requested_amount || 0);
        }
      }
    }
    const cashflow = Object.keys(cashflowMap).map(k => ({ month: k, disbursed: cashflowMap[k] }));

    const companyRes = await query(`
      SELECT c.name as company, COUNT(o.id) as offer_count 
      FROM loan_companies c
      LEFT JOIN loan_offers o ON o.company_id = c.id
      GROUP BY c.name
      ORDER BY offer_count DESC
    `);

    const recentActivityRes = await query(`
      SELECT a.*, u.first_name, u.last_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.created_at DESC
      LIMIT 10;
    `);

    return {
      metrics,
      charts: {
        cashflow,
        companies: companyRes.rows.map((row: any) => ({ name: row.company, value: Number(row.offer_count) }))
      },
      recentActivity: recentActivityRes.rows,
    };
  }
}
