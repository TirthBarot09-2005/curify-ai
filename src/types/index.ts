export type UserRole = 'patient' | 'lender';

export interface User {
  id: string;
  clerkUserId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  onboardingCompleted?: boolean;
}

export interface Patient {
  age?: number;
  gender?: string;
  comorbidities?: string[];
  budget?: number;
  location?: string;
}

export interface ClinicalMapping {
  originalQuery: string;
  primaryConcern: string;
  clinicalCategory: string;
  icdCode: string;
  potentialPathway: string[];
  targetProcedure: string;
  source?: string;
}

export interface CostComponent {
  name: string;
  minCost: number;
  maxCost: number;
}

export interface CostBreakdown {
  components: CostComponent[];
  totalMin: number;
  totalMax: number;
  isEstimate?: boolean;
}

export interface ConfidenceScore {
  overall: number;
  inputCompleteness: number;
  queryClarity: number;
  benchmarkMatch: number;
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
  accreditation?: string | null;
  rating?: number | null;
  distance?: number | null;
  matchScore: number;
  costBreakdown: CostBreakdown;
  confidence: ConfidenceScore;
  matchFactors: MatchFactor[];
  specialties: string[];
  bedCount?: number | null;
  established?: number | null;
  image?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  phone?: string | null;
  website?: string | null;
  
  // New Expanded Metadata
  hospital_type?: string | null;
  rating_source?: string | null;
  accreditation_status?: string | null;
  source_url?: string | null;
  data_status?: string | null;
  service_tags?: string[];
}

export interface MatchFactor {
  name: string;
  weight: number;
  score: number;
}

export type CaseStatus = 'Pending Review' | 'Approved' | 'Rejected' | 'Needs Review';
export type BrokerStage = 'Intake' | 'Company Underwriting' | 'Awaiting Patient Selection' | 'Disbursed' | 'Rejected';
export type OfferStatus = 'Suggested' | 'Sent to Patient' | 'Selected by Patient' | 'Approved' | 'Declined' | 'Rejected';

export type ActivityType =
  | 'SUBMISSION'
  | 'QUEUE'
  | 'REVIEW'
  | 'NOTE'
  | 'STATUS_CHANGE'
  | 'DECISION';

export interface CaseActivityItem {
  id: string;
  caseId: string;
  type: ActivityType;
  title: string;
  description?: string;
  reason?: string;
  note?: string;
  decision?: string;
  actor: string;
  actorRole: string;
  timestamp: string;
}

export interface LoanCompany {
  id: string;
  name: string;
  logo_url: string;
  company_type: string;
  min_interest_rate: number;
  max_interest_rate: number;
  max_loan_amount: number;
  min_loan_amount: number;
  avg_processing_days: number;
  eligibility_rules: any;
  is_active: boolean;
  rating: number;
}

export interface LoanOffer {
  id: string;
  case_id: string;
  company_id: string;
  company_name?: string;
  company_logo?: string;
  offered_amount: number;
  interest_rate: number;
  tenure_months: number;
  processing_fee: number;
  status: OfferStatus;
  sent_at?: string;
  decided_at?: string;
  created_at: string;
}

export interface LoanCase {
  id: string;
  dbId?: string;
  createdAt: string;
  status: CaseStatus;
  brokerStage?: BrokerStage;
  selectedOfferId?: string;
  disbursedAmount?: number;
  disbursalDate?: string;
  patient: {
    name: string;
    age?: number;
    gender?: string;
    comorbidities?: string[];
    budget?: number;
  };
  clinicalMapping: ClinicalMapping;
  hospital: {
    id: string;
    name: string;
    city: string;
    accreditation: string;
    rating: number;
  };
  costBreakdown: CostBreakdown;
  confidence: ConfidenceScore;
  reviewNote?: string;
  rejectionReason?: string;
  activities?: CaseActivityItem[];
}

export interface AnalysisStep {
  label: string;
  status: 'pending' | 'active' | 'complete';
}

export interface IntakeFormData {
  query: string;
  location: string;
  age?: number;
  gender?: string;
  comorbidities?: string;
  budget?: number;
  isManual?: boolean;
  manualMapping?: ClinicalMapping;
}

export interface FilterState {
  city: string;
  maxDistance: number;
  maxBudget: number;
  accreditation: string;
  minRating: number;
  sortBy: 'match' | 'cost' | 'distance' | 'rating';
}

/** Patient-facing case event for notification timeline and SSE */
export interface CaseEvent {
  id: string;
  caseId: string;
  eventType: string;
  oldStatus?: string;
  newStatus?: string;
  message: string;
  createdAt: string;
}

