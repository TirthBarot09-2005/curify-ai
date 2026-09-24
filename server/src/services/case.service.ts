import { randomUUID } from 'crypto';
import { query } from '../config/database.js';
import { UnderwritingService } from './underwriting.service.js';
import { CaseEventService, getDefaultMessage } from './case-event.service.js';

export interface CreateCaseDTO {
  patientId: string;
  treatmentPlanId: string;
  requestedAmount: number;
}

export class CaseService {
  static async createCase(dto: CreateCaseDTO) {
    const caseId = randomUUID();
    const currentYear = new Date().getFullYear();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const caseNumber = `CUR-${currentYear}-${randomDigits}`;

    // 1. Fetch treatment plan + patient profile for underwriting
    const planRes = await query(
      `SELECT tp.*, h.rating as hospital_rating, h.accreditation as hospital_accreditation,
              cm.confidence as clinical_confidence
       FROM treatment_plans tp
       LEFT JOIN hospitals h ON h.id = tp.hospital_id
       LEFT JOIN clinical_mappings cm ON cm.id = tp.clinical_mapping_id
       WHERE tp.id = $1`,
      [dto.treatmentPlanId]
    );

    const plan = planRes.rows[0];
    const patientRes = await query(
      `SELECT * FROM patient_profiles WHERE user_id = $1`,
      [dto.patientId]
    );
    const patient = patientRes.rows[0] || {};

    // 2. Perform underwriting
    const uwResult = UnderwritingService.evaluate({
      monthlyIncome: Number(patient.monthly_income || 70000),
      monthlyBudget: Number(patient.monthly_budget || 160000),
      requestedAmount: dto.requestedAmount,
      minCost: plan ? plan.estimated_min_cost : 140000,
      maxCost: plan ? plan.estimated_max_cost : 170000,
      hospitalRating: plan ? Number(plan.hospital_rating) : 4.5,
      hospitalAccreditation: plan ? plan.hospital_accreditation : 'NABH',
      clinicalConfidence: plan ? Number(plan.clinical_confidence) : 0.88,
      profileCompletionPercentage: patient.profile_completion_percentage || 80,
    });

    // 3. Insert Loan Case
    const caseRes = await query(
      `INSERT INTO loan_cases (
         id, case_number, patient_id, treatment_plan_id, requested_amount,
         risk_score, risk_level, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending Review')
       RETURNING *;`,
      [
        caseId,
        caseNumber,
        dto.patientId,
        dto.treatmentPlanId,
        dto.requestedAmount,
        uwResult.riskScore,
        uwResult.riskLevel,
      ]
    );

    // 4. Insert Initial Audit Log
    await query(
      `INSERT INTO audit_logs (id, case_id, actor_user_id, actor_role, action, description, old_status, new_status, metadata, created_at)
       VALUES ($1, $2, $3, 'patient', 'SUBMISSION', $4, NULL, 'Pending Review', $5::jsonb, CURRENT_TIMESTAMP);`,
      [
        randomUUID(),
        caseId,
        dto.patientId,
        `Patient submitted treatment financing case for ₹${dto.requestedAmount.toLocaleString('en-IN')}`,
        JSON.stringify({
          requestedAmount: dto.requestedAmount,
          riskScore: uwResult.riskScore,
          riskLevel: uwResult.riskLevel,
        }),
      ]
    );

    // 5. Create patient-facing case event + trigger SSE + async email
    await CaseEventService.createEvent({
      caseId,
      userId: dto.patientId,
      eventType: 'CASE_SUBMITTED',
      oldStatus: undefined,
      newStatus: 'Pending Review',
      message: getDefaultMessage('CASE_SUBMITTED'),
    });

    return this.getCaseById(caseId);
  }

  static async getCases(filters: { status?: string; search?: string; patientId?: string }) {
    let sql = `SELECT * FROM loan_cases WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (filters.patientId) {
      sql += ` AND patient_id = $${idx++}`;
      params.push(filters.patientId);
    }

    if (filters.status && filters.status !== 'All') {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }

    sql += ` ORDER BY created_at DESC`;

    const res = await query(sql, params);
    const enrichedList: any[] = [];

    for (const row of res.rows) {
      const enriched = await this.enrichCaseRow(row);
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matches =
          (enriched.case_number || '').toLowerCase().includes(s) ||
          (enriched.first_name || '').toLowerCase().includes(s) ||
          (enriched.last_name || '').toLowerCase().includes(s) ||
          (enriched.target_procedure || '').toLowerCase().includes(s) ||
          (enriched.hospital_name || '').toLowerCase().includes(s);
        if (!matches) continue;
      }
      enrichedList.push(this.formatCaseDossier(enriched));
    }

    return enrichedList;
  }

  private static async enrichCaseRow(row: any) {
    let enriched = { ...row };

    // Fetch user
    if (row.patient_id) {
      const uRes = await query(`SELECT first_name, last_name, email, phone FROM users WHERE id = $1`, [row.patient_id]);
      if (uRes.rowCount > 0) {
        const u = uRes.rows[0];
        enriched.first_name = u.first_name;
        enriched.last_name = u.last_name;
        enriched.patient_email = u.email;
        enriched.patient_phone = u.phone;
      }

      // Fetch patient profile
      const pRes = await query(`SELECT age, gender, city as patient_city, monthly_budget, monthly_income, existing_conditions FROM patient_profiles WHERE user_id = $1`, [row.patient_id]);
      if (pRes.rowCount > 0) {
        const p = pRes.rows[0];
        enriched = { ...enriched, ...p };
      }
    }

    // Fetch treatment plan
    if (row.treatment_plan_id) {
      const tpRes = await query(`SELECT * FROM treatment_plans WHERE id = $1`, [row.treatment_plan_id]);
      if (tpRes.rowCount > 0) {
        const tp = tpRes.rows[0];
        enriched.estimated_min_cost = tp.estimated_min_cost;
        enriched.estimated_max_cost = tp.estimated_max_cost;
        enriched.cost_breakdown = tp.cost_breakdown;

        // Fetch hospital
        if (tp.hospital_id) {
          const hRes = await query(`SELECT id as hospital_id, name as hospital_name, city as hospital_city, address as hospital_address, accreditation as hospital_accreditation, rating as hospital_rating FROM hospitals WHERE id = $1`, [tp.hospital_id]);
          if (hRes.rowCount > 0) {
            enriched = { ...enriched, ...hRes.rows[0] };
          }
        }

        // Fetch clinical mapping
        if (tp.clinical_mapping_id) {
          const cmRes = await query(`SELECT * FROM clinical_mappings WHERE id = $1`, [tp.clinical_mapping_id]);
          if (cmRes.rowCount > 0) {
            const cm = cmRes.rows[0];
            enriched.primary_concern = cm.primary_concern;
            enriched.target_procedure = cm.target_procedure;
            enriched.clinical_category = cm.clinical_category;
            enriched.icd_code = cm.icd_code;
            enriched.potential_pathway = cm.potential_pathway;
            enriched.original_query = cm.query;
          }
        }
      }
    }

    return enriched;
  }

  static async getCaseById(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const res = await query(
      `SELECT * FROM loan_cases WHERE ${isUuid ? 'id = $1' : 'case_number = $1'}`,
      [id]
    );

    if (res.rowCount === 0) {
      const err: any = new Error('Loan case not found');
      err.statusCode = 404;
      throw err;
    }

    const caseRow = await this.enrichCaseRow(res.rows[0]);

    // Fetch notes
    const notesRes = await query(
      `SELECT cn.*, u.first_name, u.last_name, u.role
       FROM case_notes cn
       JOIN users u ON u.id = cn.author_user_id
       WHERE cn.case_id = $1
       ORDER BY cn.created_at ASC`,
      [caseRow.id]
    );

    // Fetch audit logs
    const auditRes = await query(
      `SELECT al.*, u.first_name, u.last_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE al.case_id = $1
       ORDER BY al.created_at ASC`,
      [caseRow.id]
    );

    return this.formatCaseDossier(caseRow, notesRes.rows, auditRes.rows);
  }

  static async approveCase(caseId: string, lenderId: string, approvedAmount: number, decisionComment: string) {
    const existing = await this.getCaseById(caseId);
    const dbId = (existing as any).dbId || existing.id;
    const oldStatus = existing.status;

    await query(
      `UPDATE loan_cases
       SET status = 'Approved',
           approved_amount = $1,
           decision_comment = $2,
           lender_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [approvedAmount, decisionComment, lenderId, dbId]
    );

    await query(
      `INSERT INTO audit_logs (id, case_id, actor_user_id, actor_role, action, description, old_status, new_status, metadata, created_at)
       VALUES ($1, $2, $3, 'lender', 'DECISION', $4, $5, 'Approved', $6::jsonb, CURRENT_TIMESTAMP);`,
      [
        randomUUID(),
        dbId,
        lenderId,
        `Case approved for ₹${approvedAmount.toLocaleString('en-IN')}. ${decisionComment}`,
        oldStatus,
        JSON.stringify({ approvedAmount, decisionComment }),
      ]
    );

    // Create patient-facing case event + trigger SSE + async email
    await CaseEventService.createEvent({
      caseId: dbId,
      userId: lenderId,
      eventType: 'CASE_APPROVED',
      oldStatus,
      newStatus: 'Approved',
      message: getDefaultMessage('CASE_APPROVED'),
      metadata: { approvedAmount, caseNumber: existing.id },
    });

    return this.getCaseById(dbId);
  }

  static async rejectCase(caseId: string, lenderId: string, reason: string) {
    const existing = await this.getCaseById(caseId);
    const dbId = (existing as any).dbId || existing.id;
    const oldStatus = existing.status;

    await query(
      `UPDATE loan_cases
       SET status = 'Rejected',
           rejection_reason = $1,
           lender_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reason, lenderId, dbId]
    );

    await query(
      `INSERT INTO audit_logs (id, case_id, actor_user_id, actor_role, action, description, old_status, new_status, metadata, created_at)
       VALUES ($1, $2, $3, 'lender', 'DECISION', $4, $5, 'Rejected', $6::jsonb, CURRENT_TIMESTAMP);`,
      [
        randomUUID(),
        dbId,
        lenderId,
        `Case rejected. Reason: ${reason}`,
        oldStatus,
        JSON.stringify({ rejectionReason: reason }),
      ]
    );

    // Create patient-facing case event + trigger SSE + async email
    await CaseEventService.createEvent({
      caseId: dbId,
      userId: lenderId,
      eventType: 'CASE_REJECTED',
      oldStatus,
      newStatus: 'Rejected',
      message: getDefaultMessage('CASE_REJECTED'),
      metadata: { caseNumber: existing.id },
    });

    return this.getCaseById(dbId);
  }

  static async reviewCase(caseId: string, lenderId: string, reviewNote: string) {
    const existing = await this.getCaseById(caseId);
    const dbId = (existing as any).dbId || existing.id;
    const oldStatus = existing.status;

    await query(
      `UPDATE loan_cases
       SET status = 'Needs Review',
           review_note = $1,
           lender_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reviewNote, lenderId, dbId]
    );

    await query(
      `INSERT INTO audit_logs (id, case_id, actor_user_id, actor_role, action, description, old_status, new_status, metadata, created_at)
       VALUES ($1, $2, $3, 'lender', 'STATUS_CHANGE', $4, $5, 'Needs Review', $6::jsonb, CURRENT_TIMESTAMP);`,
      [
        randomUUID(),
        dbId,
        lenderId,
        `Case flagged for review: ${reviewNote}`,
        oldStatus,
        JSON.stringify({ reviewNote }),
      ]
    );

    // Create patient-facing case event + trigger SSE + async email
    await CaseEventService.createEvent({
      caseId: dbId,
      userId: lenderId,
      eventType: 'CASE_NEEDS_VERIFICATION',
      oldStatus,
      newStatus: 'Needs Review',
      message: getDefaultMessage('CASE_NEEDS_VERIFICATION'),
      metadata: { caseNumber: existing.id },
    });

    return this.getCaseById(dbId);
  }

  static async addNote(caseId: string, authorId: string, note: string) {
    const existing = await this.getCaseById(caseId);
    const dbId = (existing as any).dbId || existing.id;
    const noteId = randomUUID();

    await query(
      `INSERT INTO case_notes (id, case_id, author_user_id, note, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP);`,
      [noteId, dbId, authorId, note]
    );

    await query(
      `INSERT INTO audit_logs (id, case_id, actor_user_id, actor_role, action, description, old_status, new_status, metadata, created_at)
       VALUES ($1, $2, $3, 'lender', 'NOTE', $4, $5, $5, '{}'::jsonb, CURRENT_TIMESTAMP);`,
      [
        randomUUID(),
        dbId,
        authorId,
        `Added note: "${note.slice(0, 60)}${note.length > 60 ? '...' : ''}"`,
        existing.status,
      ]
    );

    return this.getCaseById(dbId);
  }

  static async getAuditLogs(caseId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseId);
    let resolvedId = caseId;
    if (!isUuid) {
      const cRes = await query(`SELECT id FROM loan_cases WHERE case_number = $1`, [caseId]);
      if (cRes.rowCount > 0) resolvedId = cRes.rows[0].id;
    }

    const res = await query(
      `SELECT al.*, u.first_name, u.last_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE al.case_id = $1
       ORDER BY al.created_at ASC`,
      [resolvedId]
    );
    return res.rows;
  }

  /**
   * Transforms raw database row into standard LoanCase object matching frontend types
   */
  private static formatCaseDossier(row: any, notes: any[] = [], auditLogs: any[] = []) {
    const costBreakdown = typeof row.cost_breakdown === 'string'
      ? JSON.parse(row.cost_breakdown)
      : (row.cost_breakdown || { components: [], totalMin: row.estimated_min_cost || 140000, totalMax: row.estimated_max_cost || 170000 });

    const existingConditions = typeof row.existing_conditions === 'string'
      ? JSON.parse(row.existing_conditions)
      : (row.existing_conditions || []);

    const activities = auditLogs.map((a: any) => ({
      id: a.id,
      caseId: a.case_id,
      type: a.action || 'REVIEW',
      title: a.description,
      description: a.description,
      actor: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Curify System',
      actorRole: a.actor_role === 'lender' ? 'Senior Underwriter' : (a.actor_role === 'patient' ? 'Patient' : 'System'),
      timestamp: a.created_at,
    }));

    return {
      id: row.case_number || row.id,
      dbId: row.id,
      patientId: row.patient_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      brokerStage: row.broker_stage || 'Intake',
      selectedOfferId: row.selected_offer_id,
      disbursedAmount: row.disbursed_amount,
      disbursalDate: row.disbursal_date,
      requestedAmount: row.requested_amount,
      approvedAmount: row.approved_amount,
      riskScore: row.risk_score,
      riskLevel: row.risk_level,
      decisionComment: row.decision_comment,
      rejectionReason: row.rejection_reason,
      reviewNote: row.review_note,
      patient: {
        name: `${row.first_name} ${row.last_name}`.trim(),
        age: row.age || 52,
        gender: row.gender || 'Male',
        city: row.patient_city || 'Ahmedabad',
        comorbidities: existingConditions,
        budget: row.monthly_budget ? Number(row.monthly_budget) : 160000,
        phone: row.patient_phone,
      },
      clinicalMapping: {
        originalQuery: row.original_query || row.primary_concern || '',
        primaryConcern: row.primary_concern || '',
        clinicalCategory: row.clinical_category || '',
        icdCode: row.icd_code || 'M17.1',
        targetProcedure: row.target_procedure || '',
        potentialPathway: typeof row.potential_pathway === 'string' ? JSON.parse(row.potential_pathway) : (row.potential_pathway || []),
      },
      hospital: {
        id: row.hospital_id || 'hosp-001',
        name: row.hospital_name || 'Apollo Hospitals',
        city: row.hospital_city || 'Ahmedabad',
        address: row.hospital_address,
        accreditation: row.hospital_accreditation || 'NABH',
        rating: Number(row.hospital_rating || 4.8),
      },
      costBreakdown,
      confidence: {
        overall: 0.91,
        inputCompleteness: 0.94,
        queryClarity: 0.88,
        benchmarkMatch: 0.92,
      },
      notes: notes.map((n) => ({
        id: n.id,
        author: `${n.first_name} ${n.last_name}`.trim(),
        role: n.role,
        note: n.note,
        createdAt: n.created_at,
      })),
      activities,
    };
  }
}
