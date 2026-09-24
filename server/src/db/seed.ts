import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { query, pool, getIsSQLite } from '../config/database.js';
import { PricingEngine } from '../services/pricing.service.js';
import { getDataFilePath } from '../utils/paths.js';

export async function seedDatabase() {
  // When SQLite already has real user data, skip demo user/case seeding
  // but ALWAYS seed reference data (hospitals, procedures, companies) if empty.
  let skipDemoData = false;
  if (getIsSQLite()) {
    try {
      const result = await query('SELECT COUNT(*) as count FROM users');
      const count = Number(result.rows[0]?.count || 0);
      if (count > 0) {
        console.log(`[DB] SQLite already has ${count} users — skipping demo user/case seeding.`);
        skipDemoData = true;
      }
    } catch {
      // Table might not exist yet, proceed with full seeding
    }
  }

  console.log('[DB] Seeding database...');

  if (!skipDemoData) {
    const passwordHash = await bcrypt.hash('Curify@2026', 10);

    // 1. Clear existing data in reverse dependency order
    const tables = [
      'audit_logs', 'case_notes', 'loan_cases', 'treatment_plans', 'clinical_mappings',
      'hospital_procedures', 'hospitals', 'lender_profiles', 'patient_profiles', 'users'
    ];
    for (const table of tables) {
      try {
        await query(`DELETE FROM ${table};`);
      } catch {
        // ignore if table doesn't exist yet
      }
    }

  // 2. Insert Users (Lenders only for underwriter review; demo patient removed)
  const samplePatientId = '00000000-0000-0000-0000-000000000001';
  const userResult = await query(
    `INSERT INTO users (id, clerk_user_id, email, password_hash, role, first_name, last_name, phone)
     VALUES 
       ($2, 'sample_applicant_internal', 'sample.applicant@curify.internal', $1, 'patient', 'Sample', 'Applicant', '+91 98765 00000'),
       ('22222222-2222-2222-2222-222222222222', 'demo_lender_clerk_id', 'neha@curify.ai', $1, 'lender', 'Neha', 'Kapoor', '+91 98765 43211'),
       ('44444444-4444-4444-4444-444444444444', 'demo_lender_clerk_id_2', 'lender@curify.ai', $1, 'lender', 'Neha', 'Kapoor', '+91 98765 43211')
     RETURNING id, email, role;`,
    [passwordHash, samplePatientId]
  );

  console.log(`[DB] Inserted ${userResult.rowCount} seed users.`);

  // 3. Insert Patient Profiles (Only for internal sample applicant)
  await query(`
    INSERT INTO patient_profiles (id, user_id, date_of_birth, age, gender, city, state, phone, occupation, employment_status, monthly_income, monthly_budget, preferred_language, preferred_city, existing_conditions, onboarding_completed, onboarding_step, profile_completion_percentage)
    VALUES
      ($1, $2, '1974-05-15', 52, 'Male', 'Ahmedabad', 'Gujarat', '+91 98765 00000', 'Senior Accountant', 'Full-time Salaried', 85000, 160000, 'English', 'Ahmedabad', '["Mild Hypertension (controlled)"]'::jsonb, TRUE, 5, 100);
  `, [randomUUID(), samplePatientId]);

  // 4. Insert Lender Profiles
  await query(`
    INSERT INTO lender_profiles (id, user_id, organization_name, designation, employee_id)
    VALUES
      ($1, '22222222-2222-2222-2222-222222222222', 'Curify Health Finance', 'Senior Medical Underwriter', 'LND-1001'),
      ($2, '44444444-4444-4444-4444-444444444444', 'Curify Health Finance', 'Senior Medical Underwriter', 'LND-1002');
  `, [randomUUID(), randomUUID()]);
  } // end if (!skipDemoData) — demo users/profiles block

  // ─── LENDER SEED ACCOUNTS: Ensure underwriter portal accounts exist ──
  const lenderCheck = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'lender'`);
  if (Number(lenderCheck.rows[0]?.count || 0) === 0) {
    const passwordHash = await bcrypt.hash('Curify@2026', 10);
    await query(
      `INSERT INTO users (id, clerk_user_id, email, password_hash, role, first_name, last_name, phone)
       VALUES 
         ('22222222-2222-2222-2222-222222222222', 'demo_lender_clerk_id', 'neha@curify.ai', $1, 'lender', 'Neha', 'Kapoor', '+91 98765 43211'),
         ('44444444-4444-4444-4444-444444444444', 'demo_lender_clerk_id_2', 'lender@curify.ai', $1, 'lender', 'Neha', 'Kapoor', '+91 98765 43211');`,
      [passwordHash]
    );
    await query(`
      INSERT INTO lender_profiles (id, user_id, organization_name, designation, employee_id)
      VALUES
        ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222222', 'Curify Health Finance', 'Senior Medical Underwriter', 'LND-1001'),
        ('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444444', 'Curify Health Finance', 'Senior Medical Underwriter', 'LND-1002');
    `);
    console.log('[DB] Ensured lender seed accounts exist.');
  }

  // ─── REFERENCE DATA: Always seed if tables are empty ──────────────────

  // 5. Insert Hospitals from expanded SQL (only if hospitals table is empty)
  const hospCount = await query('SELECT COUNT(*) as count FROM hospitals');
  const needsHospitals = Number(hospCount.rows[0]?.count || 0) === 0;
  if (needsHospitals) {
    console.log('[DB] Running hospitals_expanded.sql...');
    const sqlPath = getDataFilePath('datafor curify/hospitals_expanded.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    if (getIsSQLite()) {
      // SQLite: execute each statement individually, skipping unsupported PG syntax
      const statements = sqlContent.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        // Skip PostgreSQL-specific ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL
        if (/ALTER\s+TABLE\s+\S+\s+ALTER\s+COLUMN/i.test(stmt)) continue;
        // Skip commented-out blocks
        if (stmt.startsWith('--')) continue;
        try {
          await query(stmt + ';');
        } catch (err: any) {
          // Silently skip column/table already exists errors
          if (err.message?.includes('already exists') || err.message?.includes('duplicate column')) continue;
          // Log but don't crash
          if (!err.message?.includes('no such column')) {
            console.warn(`[DB] SQLite seed statement warning: ${err.message?.slice(0, 80)}`);
          }
        }
      }
    } else {
      await query(sqlContent);
    }
    console.log('[DB] Inserted expanded hospitals and service tags.');
  } else {
    console.log('[DB] Hospitals already seeded — skipping.');
  }

  // 6. Insert Hospital Procedures from CSV (if hospital_procedures is empty)
  const procCheck = await query('SELECT COUNT(*) as count FROM hospital_procedures');
  const needsProcedures = Number(procCheck.rows[0]?.count || 0) === 0;
  if (needsProcedures) {
    console.log('[DB] Reading procedure_pricing_import_template.csv...');
    const hospRows = await query(`SELECT id, name, city, accreditation, bed_count, hospital_type FROM hospitals;`);
    const hospMap = new Map<string, any>();
    for (const h of hospRows.rows) {
      hospMap.set(h.id, h);
    }

    const csvPath = getDataFilePath('datafor curify/procedure_pricing_import_template.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    let procCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length >= 5) {
        const hospital_id = parts[0];
        // Ensure hospital exists before inserting procedure (foreign key constraint)
        if (!hospMap.has(hospital_id)) continue;

        const name = parts[3];
        const category = parts[4];
        let min_cost = parts[5] ? parseInt(parts[5], 10) : null;
        let max_cost = parts[6] ? parseInt(parts[6], 10) : null;
        const duration = parts[7] || null;

        // Populate realistic differentiated pricing if CSV column was empty
        if (!min_cost || !max_cost) {
          const hospInfo = hospMap.get(hospital_id) || { id: hospital_id };
          const pricing = PricingEngine.calculatePricing({
            procedureName: name,
            clinicalCategory: category,
            city: hospInfo.city,
            hospital: hospInfo,
          });
          min_cost = pricing.minCost;
          max_cost = pricing.maxCost;
        }

        const procId = randomUUID();
        try {
          await query(
            `INSERT INTO hospital_procedures (id, hospital_id, procedure_name, clinical_category, min_cost, max_cost, estimated_duration)
             VALUES ($1, $2, $3, $4, $5, $6, $7);`, 
            [procId, hospital_id, name, category, min_cost, max_cost, duration]
          );
          procCount++;
        } catch {
          // ignore individual procedure insert error
        }
      }
    }
    console.log(`[DB] Inserted ${procCount} procedures from CSV with differentiated pricing.`);
  } else {
    console.log('[DB] Hospital procedures already seeded — skipping.');
  }

  // ─── REFERENCE DATA: Loan Companies (always seed if empty) ────────────
  const companyCount = await query('SELECT COUNT(*) as count FROM loan_companies');
  const needsCompanies = Number(companyCount.rows[0]?.count || 0) === 0;

  const companies = [
    {
      id: '33333333-3333-3333-3333-333333333331',
      name: 'Bajaj Finserv Health',
      logo_url: 'https://cdn.iconscout.com/icon/free/png-256/bajaj-finserv-2-555357.png',
      company_type: 'NBFC',
      min_interest_rate: 0.0,
      max_interest_rate: 12.0,
      max_loan_amount: 500000,
      min_loan_amount: 10000,
      avg_processing_days: 1,
      eligibility_rules: { minIncome: 25000, maxAge: 65, categories: ['Orthopedics', 'Cardiology', 'General Surgery', 'Urology'] },
      rating: 4.8
    },
    {
      id: '33333333-3333-3333-3333-333333333332',
      name: 'HDFC MediLoan',
      logo_url: 'https://cdn.iconscout.com/icon/free/png-256/hdfc-1-555358.png',
      company_type: 'Bank',
      min_interest_rate: 8.5,
      max_interest_rate: 14.5,
      max_loan_amount: 1000000,
      min_loan_amount: 50000,
      avg_processing_days: 3,
      eligibility_rules: { minIncome: 35000, maxAge: 60, categories: ['Orthopedics', 'Cardiology', 'Ophthalmology', 'Gastroenterology'] },
      rating: 4.5
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Care Health Finance',
      logo_url: 'https://cdn.iconscout.com/icon/free/png-256/care-health-555359.png',
      company_type: 'NBFC',
      min_interest_rate: 9.0,
      max_interest_rate: 16.0,
      max_loan_amount: 300000,
      min_loan_amount: 15000,
      avg_processing_days: 2,
      eligibility_rules: { minIncome: 15000, maxAge: 70, categories: ['General Medicine', 'Urology', 'Ophthalmology', 'Orthopedics'] },
      rating: 4.2
    },
    {
      id: '33333333-3333-3333-3333-333333333334',
      name: 'Tata Capital Healthcare',
      logo_url: 'https://cdn.iconscout.com/icon/free/png-256/tata-555360.png',
      company_type: 'NBFC',
      min_interest_rate: 9.5,
      max_interest_rate: 15.0,
      max_loan_amount: 1500000,
      min_loan_amount: 100000,
      avg_processing_days: 4,
      eligibility_rules: { minIncome: 50000, maxAge: 55, categories: ['Cardiology', 'Oncology', 'Organ Transplant'] },
      rating: 4.7
    },
    {
      id: '33333333-3333-3333-3333-333333333335',
      name: 'ICICI Bank Health EMI',
      logo_url: 'https://cdn.iconscout.com/icon/free/png-256/icici-555361.png',
      company_type: 'Bank',
      min_interest_rate: 7.9,
      max_interest_rate: 13.9,
      max_loan_amount: 800000,
      min_loan_amount: 25000,
      avg_processing_days: 2,
      eligibility_rules: { minIncome: 30000, maxAge: 62, categories: ['Orthopedics', 'Cardiology', 'General Surgery', 'Gastroenterology'] },
      rating: 4.6
    }
  ];

  if (needsCompanies) {
    for (const c of companies) {
      await query(
        `INSERT INTO loan_companies (id, name, logo_url, company_type, min_interest_rate, max_interest_rate, max_loan_amount, min_loan_amount, avg_processing_days, eligibility_rules, rating)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11);`,
        [c.id, c.name, c.logo_url, c.company_type, c.min_interest_rate, c.max_interest_rate, c.max_loan_amount, c.min_loan_amount, c.avg_processing_days, JSON.stringify(c.eligibility_rules), c.rating]
      );
    }
    console.log('[DB] Inserted loan companies.');
  } else {
    console.log('[DB] Loan companies already seeded — skipping.');
  }

  // ─── DEMO DATA: Clinical mappings, treatment plans, cases, notes, events, offers ──
  if (!skipDemoData) {
  // 7. Insert Demo Clinical Mappings
  const kneeMappingId = '77777777-7777-7777-7777-777777777771';
  await query(
    `INSERT INTO clinical_mappings (id, patient_id, query, primary_concern, clinical_category, icd_code, target_procedure, potential_pathway, confidence)
     VALUES (
       $1,
       '00000000-0000-0000-0000-000000000001',
       'Total knee replacement surgery under ₹1.6L in Ahmedabad',
       'Advanced degenerative osteoarthritis with joint space narrowing requiring total knee arthroplasty',
       'Orthopedics — Joint Reconstruction',
       'M17.1',
       'Total Knee Replacement (Unilateral TKA)',
       $2::jsonb,
       0.92
     );`,
    [kneeMappingId, JSON.stringify([
      'Orthopedic Specialist Consultation & Alignment Radiography',
      'Pre-Anesthetic Medical Fitness & High-Flexion Implant Sizing',
      'Total Knee Arthroplasty (Unilateral TKA with Computer Navigation)',
      'Inpatient Physical Therapy & Accelerated Mobility Protocol (3–4 days)'
    ])]
  );

  const gastroMappingId = '77777777-7777-7777-7777-777777777772';
  await query(
    `INSERT INTO clinical_mappings (id, patient_id, query, primary_concern, clinical_category, icd_code, target_procedure, potential_pathway, confidence)
     VALUES (
       $1,
       '00000000-0000-0000-0000-000000000001',
       'Laparoscopic cholecystectomy with 2-day recovery stay',
       'Symptomatic cholelithiasis (gallstones) and gallbladder inflammation requiring laparoscopic surgical excision',
       'Gastroenterology & Laparoscopic Surgery',
       'K80.20',
       'Laparoscopic Cholecystectomy (Gallbladder Removal)',
       $2::jsonb,
       0.89
     );`,
    [gastroMappingId, JSON.stringify([
      'Gastroenterologist & Laparoscopic Surgical Consultation',
      'High-Resolution Abdominal Ultrasound & Liver Function Panel (LFT)',
      'Laparoscopic Cholecystectomy (Four-Port Keyhole Resection)',
      'Post-Operative Recovery, Dietary Management & Rapid Discharge (1–2 days)'
    ])]
  );

  // 8. Insert Treatment Plans
  const kneePlanCost = {
    components: [
      { name: 'Surgery & OT Charges', minCost: 65000, maxCost: 75000 },
      { name: 'USFDA Approved High-Flexion Knee Implant', minCost: 45000, maxCost: 55000 },
      { name: 'Hospital Stay (3–4 days Semi-Private)', minCost: 15000, maxCost: 18000 },
      { name: 'Surgeon, Anesthetist & OT Team Fees', minCost: 12000, maxCost: 15000 },
      { name: 'Post-Op Physical Therapy & Mobility Protocol', minCost: 5000, maxCost: 7000 },
      { name: 'Medications & Consumables Reserve', minCost: 3000, maxCost: 5000 }
    ],
    totalMin: 145000,
    totalMax: 175000
  };

  const kneePlanId = '88888888-8888-8888-8888-888888888881';
  await query(
    `INSERT INTO treatment_plans (id, patient_id, clinical_mapping_id, hospital_id, estimated_min_cost, estimated_max_cost, cost_breakdown, status)
     VALUES (
       $1,
       '00000000-0000-0000-0000-000000000001',
       $2,
       'hosp-01-01',
       145000,
       175000,
       $3::jsonb,
       'FINALIZED'
     );`,
    [kneePlanId, kneeMappingId, JSON.stringify(kneePlanCost)]
  );

  const planGastroCost = {
    components: [
      { name: 'Laparoscopic Procedure & OT Charges', minCost: 42000, maxCost: 52000 },
      { name: 'GI Surgeon & Anesthesia Fees', minCost: 8000, maxCost: 11000 },
      { name: 'Hospital Stay (1–2 days Semi-Private)', minCost: 7500, maxCost: 9500 },
      { name: 'Pre & Post-Op Ultrasound & LFT Panel', minCost: 4000, maxCost: 5500 },
      { name: 'Consumables, Trocars & Medications', minCost: 3500, maxCost: 5000 },
      { name: 'Contingency & Recovery Reserve', minCost: 3000, maxCost: 5000 }
    ],
    totalMin: 68000,
    totalMax: 88000
  };

  const gastroPlanId = '88888888-8888-8888-8888-888888888882';
  await query(
    `INSERT INTO treatment_plans (id, patient_id, clinical_mapping_id, hospital_id, estimated_min_cost, estimated_max_cost, cost_breakdown, status)
     VALUES (
       $1,
       '00000000-0000-0000-0000-000000000001',
       $2,
       'hosp-01-02',
       68000,
       88000,
       $3::jsonb,
       'FINALIZED'
     );`,
    [gastroPlanId, gastroMappingId, JSON.stringify(planGastroCost)]
  );

  const now = Date.now();
  const d3Ago = new Date(now - 3 * 86400000).toISOString();
  const d2Ago = new Date(now - 2 * 86400000).toISOString();
  const d1Ago = new Date(now - 1 * 86400000).toISOString();
  const h20Ago = new Date(now - 20 * 3600000).toISOString();
  const h18Ago = new Date(now - 18 * 3600000).toISOString();
  const h4Ago = new Date(now - 4 * 3600000).toISOString();

  // 9. Insert Loan Cases (CUR-2026-8841: Approved, CUR-2026-8842: Needs Review, CUR-2026-8843: Pending Review)
  const case1Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  await query(
    `INSERT INTO loan_cases (
       id, case_number, patient_id, lender_id, treatment_plan_id, requested_amount, approved_amount,
       risk_score, risk_level, status, decision_comment, review_note, created_at
     ) VALUES (
       $1,
       'CUR-2026-8841',
       '00000000-0000-0000-0000-000000000001',
       '22222222-2222-2222-2222-222222222222',
       $2,
       160000,
       155000,
       82,
       'LOW',
       'Approved',
       'Approved under standard orthopedic protocol. Verified disposable income of ₹85,000/mo and strong credit profile. Direct hospital disbursement authorized.',
       'Pre-assessment review complete. Patient fits tier-1 surgical financing corridor.',
       $3
     );`,
    [case1Id, kneePlanId, d3Ago]
  );

  const case2Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  await query(
    `INSERT INTO loan_cases (
       id, case_number, patient_id, lender_id, treatment_plan_id, requested_amount, approved_amount,
       risk_score, risk_level, status, decision_comment, review_note, created_at
     ) VALUES (
       $1,
       'CUR-2026-8842',
       '00000000-0000-0000-0000-000000000001',
       '22222222-2222-2222-2222-222222222222',
       $2,
       80000,
       NULL,
       58,
       'MODERATE',
       'Needs Review',
       NULL,
       'Requesting recent 3-month bank statement verification and co-applicant guarantee due to recent employment transition.',
       $3
     );`,
    [case2Id, gastroPlanId, d1Ago]
  );

  const case3Id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  await query(
    `INSERT INTO loan_cases (
       id, case_number, patient_id, lender_id, treatment_plan_id, requested_amount, approved_amount,
       risk_score, risk_level, status, created_at
     ) VALUES (
       $1,
       'CUR-2026-8843',
       '00000000-0000-0000-0000-000000000001',
       NULL,
       $2,
       150000,
       NULL,
       74,
       'LOW',
       'Pending Review',
       $3
     );`,
    [case3Id, kneePlanId, h4Ago]
  );

  // 10. Insert Case Notes
  const notes = [
    { case_id: case1Id, author: '22222222-2222-2222-2222-222222222222', text: 'Clinical assessment corroborated with Apollo orthopedics tariff table. NABH compliance verified.', date: d2Ago },
    { case_id: case1Id, author: '22222222-2222-2222-2222-222222222222', text: 'Finalized disbursement terms: 18-month tenure at 8.9% reducing interest. Direct hospital account transfer on admission day.', date: d1Ago },
    { case_id: case2Id, author: '22222222-2222-2222-2222-222222222222', text: 'Patient requested callback regarding collateral requirements. Clarified that medical loans up to ₹2,00,000 are unsecured.', date: h18Ago },
  ];

  for (const n of notes) {
    await query(
      `INSERT INTO case_notes (id, case_id, author_user_id, note, created_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [randomUUID(), n.case_id, n.author, n.text, n.date]
    );
  }

  // 11. Insert Audit Logs
  const auditLogs = [
    { case_id: case1Id, user: '00000000-0000-0000-0000-000000000001', role: 'patient', action: 'SUBMISSION', desc: 'Patient submitted treatment financing request for ₹1,60,000', oldS: null, newS: 'Pending Review', meta: { requestedAmount: 160000 }, date: d3Ago },
    { case_id: case1Id, user: '22222222-2222-2222-2222-222222222222', role: 'lender', action: 'QUEUE', desc: 'Case assigned to Senior Underwriter Neha Kapoor', oldS: 'Pending Review', newS: 'Underwriting In Progress', meta: {}, date: d2Ago },
    { case_id: case1Id, user: '22222222-2222-2222-2222-222222222222', role: 'lender', action: 'REVIEW', desc: 'Medical necessity and cost sanity checks approved', oldS: 'Underwriting In Progress', newS: 'Needs Review', meta: {}, date: d2Ago },
    { case_id: case1Id, user: '22222222-2222-2222-2222-222222222222', role: 'lender', action: 'DECISION', desc: 'Case approved for ₹1,55,000. Decision comment recorded.', oldS: 'Needs Review', newS: 'Approved', meta: { approvedAmount: 155000 }, date: d1Ago },
    { case_id: case2Id, user: '00000000-0000-0000-0000-000000000001', role: 'patient', action: 'SUBMISSION', desc: 'Patient submitted treatment financing request for ₹80,000', oldS: null, newS: 'Pending Review', meta: { requestedAmount: 80000 }, date: d1Ago },
    { case_id: case2Id, user: '22222222-2222-2222-2222-222222222222', role: 'lender', action: 'STATUS_CHANGE', desc: 'Status changed to Needs Review pending additional income proof', oldS: 'Pending Review', newS: 'Needs Review', meta: {}, date: h20Ago },
    { case_id: case3Id, user: '00000000-0000-0000-0000-000000000001', role: 'patient', action: 'SUBMISSION', desc: 'Patient submitted treatment financing request for ₹1,50,000', oldS: null, newS: 'Pending Review', meta: { requestedAmount: 150000 }, date: h4Ago }
  ];

  for (const a of auditLogs) {
    await query(
      `INSERT INTO audit_logs (id, case_id, actor_user_id, actor_role, action, description, old_status, new_status, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10);`,
      [randomUUID(), a.case_id, a.user, a.role, a.action, a.desc, a.oldS, a.newS, JSON.stringify(a.meta), a.date]
    );
  }

  // 12. Insert Case Events (for patient notification timeline)
  const caseEvents = [
    { case_id: case1Id, type: 'CASE_SUBMITTED', oldS: null, newS: 'Pending Review', msg: 'Your financing case was submitted successfully and is now in the review queue.', date: d3Ago },
    { case_id: case1Id, type: 'CASE_UNDER_REVIEW', oldS: 'Pending Review', newS: 'Underwriting In Progress', msg: 'Case assigned to Senior Underwriter Neha Kapoor.', date: d2Ago },
    { case_id: case1Id, type: 'CASE_NEEDS_VERIFICATION', oldS: 'Underwriting In Progress', newS: 'Needs Review', msg: 'Medical necessity and cost sanity checks approved.', date: d2Ago },
    { case_id: case1Id, type: 'CASE_APPROVED', oldS: 'Needs Review', newS: 'Approved', msg: 'Your financing case has been approved for ₹1,55,000.', date: d1Ago },
    { case_id: case2Id, type: 'CASE_SUBMITTED', oldS: null, newS: 'Pending Review', msg: 'Your financing case was submitted successfully and is now in the review queue.', date: d1Ago },
    { case_id: case2Id, type: 'CASE_NEEDS_VERIFICATION', oldS: 'Pending Review', newS: 'Needs Review', msg: 'Additional verification needed: please verify recent bank statements.', date: h20Ago },
    { case_id: case3Id, type: 'CASE_SUBMITTED', oldS: null, newS: 'Pending Review', msg: 'Your financing case was submitted successfully and is now in the review queue.', date: h4Ago }
  ];

  for (const ce of caseEvents) {
    await query(
      `INSERT INTO case_events (id, case_id, user_id, event_type, old_status, new_status, message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9);`,
      [randomUUID(), ce.case_id, '00000000-0000-0000-0000-000000000001', ce.type, ce.oldS, ce.newS, ce.msg, '{}', ce.date]
    );
  }

  // 13. Insert Loan Offers (demo data — tied to demo cases)
  const offer1 = randomUUID();
  const offer2 = randomUUID();
  const offer3 = randomUUID();
  
  await query(
    `INSERT INTO loan_offers (id, case_id, company_id, offered_amount, interest_rate, tenure_months, processing_fee, status, sent_at, decided_at)
     VALUES 
     ($1, $4, $7, 155000, 8.9, 18, 1500, 'Approved', $10, $11),
     ($2, $5, $8, 80000, 11.5, 12, 1000, 'Sent to Patient', $10, NULL),
     ($3, $6, $9, 150000, 0.0, 12, 2000, 'Selected by Patient', $10, $11);`,
    [offer1, offer2, offer3, case1Id, case2Id, case3Id, companies[0].id, companies[1].id, companies[2].id, d2Ago, d1Ago]
  );

  // Update loan_cases with selected offers and broker_stage
  await query(`UPDATE loan_cases SET selected_offer_id = $1, broker_stage = 'Disbursed', disbursed_amount = 155000, disbursal_date = CURRENT_DATE WHERE id = $2`, [offer1, case1Id]);
  await query(`UPDATE loan_cases SET broker_stage = 'Awaiting Patient Selection' WHERE id = $1`, [case2Id]);
  await query(`UPDATE loan_cases SET selected_offer_id = $1, broker_stage = 'Company Underwriting' WHERE id = $2`, [offer3, case3Id]);
  console.log('[DB] Inserted demo loan offers.');
  } // end if (!skipDemoData) — demo clinical mappings, plans, cases, notes, events, offers

  console.log('[DB] Database seeded successfully!');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[DB] Seeding failed:', err);
      await pool.end();
      process.exit(1);
    });
}
