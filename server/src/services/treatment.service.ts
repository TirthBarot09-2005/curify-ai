import { randomUUID } from 'crypto';
import { query } from '../config/database.js';

export class TreatmentService {
  static async createPlan(data: {
    patientId: string;
    clinicalMappingId: string;
    hospitalId: string;
    costBreakdown: any;
    status?: string;
  }) {
    const id = randomUUID();
    const totalMin = data.costBreakdown?.totalMin || 140000;
    const totalMax = data.costBreakdown?.totalMax || 170000;

    // Validate foreign keys to avoid constraint violations if non-existent/placeholder IDs are passed
    let validMappingId: string | null = null;
    if (data.clinicalMappingId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.clinicalMappingId)) {
      const check = await query('SELECT id FROM clinical_mappings WHERE id = $1 LIMIT 1', [data.clinicalMappingId]);
      if (check.rowCount && check.rowCount > 0) {
        validMappingId = data.clinicalMappingId;
      }
    }

    let validHospitalId: string | null = null;
    if (data.hospitalId) {
      const check = await query('SELECT id FROM hospitals WHERE id = $1 LIMIT 1', [data.hospitalId]);
      if (check.rowCount && check.rowCount > 0) {
        validHospitalId = data.hospitalId;
      }
    }

    const res = await query(
      `INSERT INTO treatment_plans (id, patient_id, clinical_mapping_id, hospital_id, estimated_min_cost, estimated_max_cost, cost_breakdown, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING *;`,
      [
        id,
        data.patientId,
        validMappingId,
        validHospitalId,
        totalMin,
        totalMax,
        JSON.stringify(data.costBreakdown),
        data.status || 'DRAFT',
      ]
    );

    return res.rows[0];
  }

  static async getPlansByPatient(patientId: string) {
    const res = await query(
      `SELECT tp.*, h.name as hospital_name, h.city as hospital_city, h.accreditation, h.rating,
              cm.primary_concern, cm.target_procedure, cm.clinical_category
       FROM treatment_plans tp
       LEFT JOIN hospitals h ON h.id = tp.hospital_id
       LEFT JOIN clinical_mappings cm ON cm.id = tp.clinical_mapping_id
       WHERE tp.patient_id = $1
       ORDER BY tp.created_at DESC;`,
      [patientId]
    );
    return res.rows;
  }

  static async getPlanById(id: string) {
    const res = await query(
      `SELECT tp.*, h.name as hospital_name, h.city as hospital_city, h.accreditation, h.rating, h.address as hospital_address,
              cm.primary_concern, cm.target_procedure, cm.clinical_category, cm.icd_code, cm.potential_pathway
       FROM treatment_plans tp
       LEFT JOIN hospitals h ON h.id = tp.hospital_id
       LEFT JOIN clinical_mappings cm ON cm.id = tp.clinical_mapping_id
       WHERE tp.id = $1;`,
      [id]
    );

    if (res.rowCount === 0) {
      const err: any = new Error('Treatment plan not found');
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }

  static async finalizePlan(id: string) {
    const res = await query(
      `UPDATE treatment_plans
       SET status = 'FINALIZED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *;`,
      [id]
    );

    if (res.rowCount === 0) {
      const err: any = new Error('Treatment plan not found');
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }
}
