import { randomUUID } from 'crypto';
import { query } from '../config/database.js';

export class PatientService {
  static async getProfile(userId: string) {
    const res = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone as account_phone,
              p.date_of_birth, p.age, p.gender, p.city, p.state, p.phone as profile_phone,
              p.occupation, p.employment_status, p.monthly_income, p.monthly_budget,
              p.preferred_language, p.preferred_city, p.existing_conditions,
              p.onboarding_completed, p.onboarding_step, p.profile_completion_percentage,
              p.pincode, p.blood_group, p.height, p.weight, p.known_allergies,
              p.current_medications, p.previous_surgeries, p.family_medical_history,
              p.chronic_conditions, p.emergency_contact_name, p.emergency_contact_number,
              p.emergency_contact_relation, p.preferred_hospital, p.preferred_hospital_type,
              p.preferred_specialties, p.insurance_provider, p.insurance_policy_number,
              p.insurance_type, p.insurance_expiry_date, p.insurance_coverage_type,
              p.insurance_tpa, p.insurance_cashless,
              p.created_at, p.updated_at
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (res.rowCount === 0) {
      const err: any = new Error('Patient not found');
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }

  static async updateProfile(userId: string, data: any) {
    // Update basic user fields if present
    if (data.firstName || data.lastName || data.phone) {
      await query(
        `UPDATE users
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             phone = COALESCE($3, phone),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [data.firstName || null, data.lastName || null, data.phone || null, userId]
      );
    }

    // Update profile
    const res = await query(
      `UPDATE patient_profiles
       SET
         date_of_birth = COALESCE($1, date_of_birth),
         age = COALESCE($2, age),
         gender = COALESCE($3, gender),
         city = COALESCE($4, city),
         state = COALESCE($5, state),
         phone = COALESCE($6, phone),
         occupation = COALESCE($7, occupation),
         employment_status = COALESCE($8, employment_status),
         monthly_income = COALESCE($9, monthly_income),
         monthly_budget = COALESCE($10, monthly_budget),
         preferred_language = COALESCE($11, preferred_language),
         preferred_city = COALESCE($12, preferred_city),
         existing_conditions = COALESCE($13::jsonb, existing_conditions),
         pincode = COALESCE($14, pincode),
         blood_group = COALESCE($15, blood_group),
         height = COALESCE($16, height),
         weight = COALESCE($17, weight),
         known_allergies = COALESCE($18::jsonb, known_allergies),
         current_medications = COALESCE($19::jsonb, current_medications),
         previous_surgeries = COALESCE($20::jsonb, previous_surgeries),
         family_medical_history = COALESCE($21, family_medical_history),
         chronic_conditions = COALESCE($22::jsonb, chronic_conditions),
         emergency_contact_name = COALESCE($23, emergency_contact_name),
         emergency_contact_number = COALESCE($24, emergency_contact_number),
         emergency_contact_relation = COALESCE($25, emergency_contact_relation),
         preferred_hospital = COALESCE($26, preferred_hospital),
         preferred_hospital_type = COALESCE($27, preferred_hospital_type),
         preferred_specialties = COALESCE($28::jsonb, preferred_specialties),
         insurance_provider = COALESCE($29, insurance_provider),
         insurance_policy_number = COALESCE($30, insurance_policy_number),
         insurance_type = COALESCE($31, insurance_type),
         insurance_expiry_date = COALESCE($32, insurance_expiry_date),
         insurance_coverage_type = COALESCE($33, insurance_coverage_type),
         insurance_tpa = COALESCE($34, insurance_tpa),
         insurance_cashless = COALESCE($35, insurance_cashless),
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $36
       RETURNING *;`,
      [
        data.date_of_birth || null,
        data.age || null,
        data.gender || null,
        data.city || null,
        data.state || null,
        data.phone || null,
        data.occupation || null,
        data.employment_status || null,
        data.monthly_income !== undefined ? data.monthly_income : null,
        data.monthly_budget !== undefined ? data.monthly_budget : null,
        data.preferred_language || null,
        data.preferred_city || null,
        data.existing_conditions ? JSON.stringify(data.existing_conditions) : null,
        data.pincode || null,
        data.blood_group || null,
        data.height !== undefined ? data.height : null,
        data.weight !== undefined ? data.weight : null,
        data.known_allergies ? JSON.stringify(data.known_allergies) : null,
        data.current_medications ? JSON.stringify(data.current_medications) : null,
        data.previous_surgeries ? JSON.stringify(data.previous_surgeries) : null,
        data.family_medical_history || null,
        data.chronic_conditions ? JSON.stringify(data.chronic_conditions) : null,
        data.emergency_contact_name || null,
        data.emergency_contact_number || null,
        data.emergency_contact_relation || null,
        data.preferred_hospital || null,
        data.preferred_hospital_type || null,
        data.preferred_specialties ? JSON.stringify(data.preferred_specialties) : null,
        data.insurance_provider || null,
        data.insurance_policy_number || null,
        data.insurance_type || null,
        data.insurance_expiry_date || null,
        data.insurance_coverage_type || null,
        data.insurance_tpa || null,
        data.insurance_cashless !== undefined ? data.insurance_cashless : null,
        userId,
      ]
    );

    return this.getProfile(userId);
  }

  // --- Saved Hospitals ---

  static async getSavedHospitals(userId: string) {
    const res = await query(
      `SELECT h.*, sh.id as saved_id, sh.created_at as saved_at
       FROM saved_hospitals sh
       JOIN hospitals h ON h.id = sh.hospital_id
       WHERE sh.patient_id = $1
       ORDER BY sh.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async addSavedHospital(userId: string, hospitalId: string) {
    const id = randomUUID();
    await query(
      `INSERT INTO saved_hospitals (id, patient_id, hospital_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (patient_id, hospital_id) DO NOTHING`,
      [id, userId, hospitalId]
    );
    return { success: true };
  }

  static async removeSavedHospital(userId: string, hospitalId: string) {
    await query(
      `DELETE FROM saved_hospitals WHERE patient_id = $1 AND hospital_id = $2`,
      [userId, hospitalId]
    );
    return { success: true };
  }

  // --- Patient Documents ---

  static async getDocuments(userId: string) {
    const res = await query(
      `SELECT * FROM patient_documents WHERE patient_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async addDocument(userId: string, data: any) {
    const id = randomUUID();
    const res = await query(
      `INSERT INTO patient_documents (id, patient_id, name, type, date, hospital_doctor, notes, file_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        userId,
        data.name,
        data.type,
        data.date || null,
        data.hospital_doctor || null,
        data.notes || null,
        data.file_url || null
      ]
    );
    return res.rows[0];
  }

  static async removeDocument(userId: string, documentId: string) {
    await query(
      `DELETE FROM patient_documents WHERE id = $1 AND patient_id = $2`,
      [documentId, userId]
    );
    return { success: true };
  }
}
