-- CURIFY AI PostgreSQL Schema
-- Database initialization and tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'lender', 'admin')),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);

-- 2. Patient Profiles
CREATE TABLE IF NOT EXISTS patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  age INT,
  gender VARCHAR(20),
  city VARCHAR(100) DEFAULT 'Ahmedabad',
  state VARCHAR(100) DEFAULT 'Gujarat',
  phone VARCHAR(50),
  occupation VARCHAR(100),
  employment_status VARCHAR(50),
  monthly_income DOUBLE PRECISION DEFAULT 0,
  monthly_budget DOUBLE PRECISION DEFAULT 0,
  preferred_language VARCHAR(50) DEFAULT 'English',
  preferred_city VARCHAR(100) DEFAULT 'Ahmedabad',
  existing_conditions JSONB DEFAULT '[]'::jsonb,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INT DEFAULT 1,
  profile_completion_percentage INT DEFAULT 20,
  -- New Extended Profile Fields
  pincode VARCHAR(20),
  blood_group VARCHAR(10),
  height DOUBLE PRECISION,
  weight DOUBLE PRECISION,
  known_allergies JSONB DEFAULT '[]'::jsonb,
  current_medications JSONB DEFAULT '[]'::jsonb,
  previous_surgeries JSONB DEFAULT '[]'::jsonb,
  family_medical_history TEXT,
  chronic_conditions JSONB DEFAULT '[]'::jsonb,
  emergency_contact_name VARCHAR(100),
  emergency_contact_number VARCHAR(50),
  emergency_contact_relation VARCHAR(50),
  preferred_hospital VARCHAR(100),
  preferred_hospital_type VARCHAR(50),
  preferred_specialties JSONB DEFAULT '[]'::jsonb,
  insurance_provider VARCHAR(100),
  insurance_policy_number VARCHAR(100),
  insurance_type VARCHAR(50),
  insurance_expiry_date DATE,
  insurance_coverage_type VARCHAR(50),
  insurance_tpa VARCHAR(100),
  insurance_cashless BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 3. Lender Profiles
CREATE TABLE IF NOT EXISTS lender_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_name VARCHAR(200) NOT NULL DEFAULT 'Curify Health Finance',
  designation VARCHAR(100) DEFAULT 'Senior Medical Underwriter',
  employee_id VARCHAR(50) DEFAULT 'LND-1001',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(20),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone VARCHAR(50),
  website VARCHAR(255),
  rating DOUBLE PRECISION,
  bed_count INT DEFAULT 200,
  year_established INT,
  accreditation VARCHAR(50),
  description TEXT,
  specialties JSONB DEFAULT '[]'::jsonb,
  source_city VARCHAR(100),
  hospital_type VARCHAR(50),
  rating_source VARCHAR(255),
  accreditation_status VARCHAR(100),
  source_url VARCHAR(500),
  source_last_reviewed VARCHAR(100),
  source_license VARCHAR(50),
  data_status TEXT,
  coordinates_status TEXT,
  pricing_status TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hospitals_source_city ON hospitals(source_city);
CREATE INDEX IF NOT EXISTS idx_hospitals_type ON hospitals(hospital_type);

-- 4.1 Hospital Service Tags
CREATE TABLE IF NOT EXISTS hospital_service_tags (
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  source VARCHAR(100) DEFAULT 'derived_from_specialties',
  PRIMARY KEY (hospital_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_hospital_service_tags_hospital ON hospital_service_tags(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_service_tags_tag ON hospital_service_tags(tag);

-- 5. Hospital Procedures
CREATE TABLE IF NOT EXISTS hospital_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  procedure_name VARCHAR(255) NOT NULL,
  clinical_category VARCHAR(100) NOT NULL,
  min_cost INT,
  max_cost INT,
  estimated_duration VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Clinical Mappings
CREATE TABLE IF NOT EXISTS clinical_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  primary_concern VARCHAR(255) NOT NULL,
  clinical_category VARCHAR(100) NOT NULL,
  icd_code VARCHAR(50),
  target_procedure VARCHAR(255) NOT NULL,
  potential_pathway JSONB DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION DEFAULT 0.88,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Treatment Plans
CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinical_mapping_id UUID REFERENCES clinical_mappings(id) ON DELETE SET NULL,
  hospital_id VARCHAR(100) REFERENCES hospitals(id) ON DELETE SET NULL,
  estimated_min_cost INT NOT NULL,
  estimated_max_cost INT NOT NULL,
  cost_breakdown JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Loan Cases
CREATE TABLE IF NOT EXISTS loan_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(100) UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL,
  requested_amount INT NOT NULL,
  approved_amount INT,
  risk_score INT DEFAULT 50,
  risk_level VARCHAR(50) DEFAULT 'MODERATE',
  status VARCHAR(50) DEFAULT 'Pending Review',
  decision_comment TEXT,
  rejection_reason TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Case Notes
CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES loan_cases(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES loan_cases(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Case Events (Patient-facing notification history)
CREATE TABLE IF NOT EXISTS case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES loan_cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal lookup speeds
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_rating ON hospitals(rating);
CREATE INDEX IF NOT EXISTS idx_hospitals_accreditation ON hospitals(accreditation);
CREATE INDEX IF NOT EXISTS idx_hospital_procedures_hosp ON hospital_procedures(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_procedures_cat ON hospital_procedures(clinical_category);
CREATE INDEX IF NOT EXISTS idx_clinical_mappings_patient ON clinical_mappings(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_loan_cases_patient ON loan_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_loan_cases_status ON loan_cases(status);
CREATE INDEX IF NOT EXISTS idx_loan_cases_number ON loan_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_case_events_case ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_case_events_type ON case_events(event_type);

-- ============================================================
-- GEMINI AI INTEGRATION — ADDITIVE MIGRATIONS
-- ============================================================

-- 12. Clinical mappings: AI source tracking + semantic cache
ALTER TABLE clinical_mappings ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'fallback';
ALTER TABLE clinical_mappings ADD COLUMN IF NOT EXISTS cache_key VARCHAR(64);
ALTER TABLE clinical_mappings ADD COLUMN IF NOT EXISTS reasoning TEXT;
CREATE INDEX IF NOT EXISTS idx_clinical_mappings_cache ON clinical_mappings(cache_key);

-- 13. Patient profiles: free-text onboarding notes (referenced by clinical prompt)
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- 14. Loan cases: AI-generated underwriting rationale
ALTER TABLE loan_cases ADD COLUMN IF NOT EXISTS risk_rationale TEXT;
ALTER TABLE loan_cases ADD COLUMN IF NOT EXISTS risk_rationale_source VARCHAR(20);

-- 15. AI usage quotas (user-facing daily limit)
CREATE TABLE IF NOT EXISTS ai_usage_quotas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  prompt_count INT NOT NULL DEFAULT 0,
  daily_limit  INT NOT NULL DEFAULT 3,
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, usage_date)
);
CREATE INDEX IF NOT EXISTS idx_ai_quotas_user_date ON ai_usage_quotas(user_id, usage_date);

-- 16. Case dossier executive summaries (PDF cache)
CREATE TABLE IF NOT EXISTS case_dossier_summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      UUID NOT NULL REFERENCES loan_cases(id) ON DELETE CASCADE,
  case_status  VARCHAR(50) NOT NULL,
  summary_text TEXT NOT NULL,
  source       VARCHAR(20) DEFAULT 'gemini',
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (case_id, case_status)
);
CREATE INDEX IF NOT EXISTS idx_dossier_summaries_case ON case_dossier_summaries(case_id);

-- 17. Case note summaries (Integration Point 4 — lowest priority)
CREATE TABLE IF NOT EXISTS case_note_summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      UUID NOT NULL REFERENCES loan_cases(id) ON DELETE CASCADE,
  note_count   INT NOT NULL,
  summary_text TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (case_id, note_count)
);

-- ============================================================
-- BROKER MARKETPLACE EXTENSION
-- ============================================================

-- 18. Loan Companies
CREATE TABLE IF NOT EXISTS loan_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  logo_url TEXT,
  company_type VARCHAR(50) DEFAULT 'NBFC',
  min_interest_rate DOUBLE PRECISION NOT NULL,
  max_interest_rate DOUBLE PRECISION NOT NULL,
  max_loan_amount INT NOT NULL,
  min_loan_amount INT DEFAULT 10000,
  avg_processing_days INT DEFAULT 3,
  eligibility_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  partner_since DATE DEFAULT CURRENT_DATE,
  rating DOUBLE PRECISION DEFAULT 4.0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. Loan Offers
CREATE TABLE IF NOT EXISTS loan_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES loan_cases(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES loan_companies(id) ON DELETE CASCADE,
  offered_amount INT NOT NULL,
  interest_rate DOUBLE PRECISION NOT NULL,
  tenure_months INT NOT NULL,
  processing_fee INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Suggested',
  sent_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loan_offers_case ON loan_offers(case_id);
CREATE INDEX IF NOT EXISTS idx_loan_offers_company ON loan_offers(company_id);

-- 20. Extend loan_cases for broker workflow
ALTER TABLE loan_cases ADD COLUMN IF NOT EXISTS selected_offer_id UUID REFERENCES loan_offers(id) ON DELETE SET NULL;
ALTER TABLE loan_cases ADD COLUMN IF NOT EXISTS broker_stage VARCHAR(50) DEFAULT 'Intake';
ALTER TABLE loan_cases ADD COLUMN IF NOT EXISTS disbursed_amount INT;
ALTER TABLE loan_cases ADD COLUMN IF NOT EXISTS disbursal_date DATE;

-- 21. Saved Hospitals
CREATE TABLE IF NOT EXISTS saved_hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(patient_id, hospital_id)
);

-- 22. Patient Documents
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  date DATE,
  hospital_doctor VARCHAR(255),
  notes TEXT,
  file_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
