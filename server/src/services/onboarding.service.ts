import { query } from '../config/database.js';
import { randomUUID } from 'crypto';

export interface OnboardingUpdateData {
  step?: number;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  city?: string;
  state?: string;
  phone?: string;
  occupation?: string;
  employment_status?: string;
  monthly_income?: number;
  monthly_budget?: number;
  preferred_language?: string;
  preferred_city?: string;
  existing_conditions?: string[];
  onboarding_completed?: boolean;
}

export class OnboardingService {
  static async getOnboardingState(userId: string) {
    let res = await query(
      `SELECT p.*, u.first_name, u.last_name, u.email
       FROM patient_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [userId]
    );

    if (res.rowCount === 0) {
      // Create initial profile if missing
      await query(
        `INSERT INTO patient_profiles (id, user_id, onboarding_completed, onboarding_step, profile_completion_percentage, created_at, updated_at)
         VALUES ($1, $2, FALSE, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO NOTHING;`,
        [randomUUID(), userId]
      );
      res = await query(
        `SELECT p.*, u.first_name, u.last_name, u.email
         FROM patient_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE p.user_id = $1`,
        [userId]
      );
    }

    return res.rows[0] || null;
  }

  static async updateOnboarding(userId: string, data: OnboardingUpdateData) {
    const existing = await this.getOnboardingState(userId);
    const step = data.step !== undefined ? data.step : (existing?.onboarding_step || 1);

    // Calculate completion percentage based on step
    let completion = existing?.profile_completion_percentage || 0;
    if (step === 1) completion = 20;
    else if (step === 2) completion = 45;
    else if (step === 3) completion = 70;
    else if (step === 4) completion = 90;
    else if (step >= 5) completion = 100;

    const completed = data.onboarding_completed ?? (step >= 5);

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
         onboarding_step = $14,
         profile_completion_percentage = $15,
         onboarding_completed = $16,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $17
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
        step,
        completion,
        completed,
        userId,
      ]
    );

    return res.rows[0];
  }
}
