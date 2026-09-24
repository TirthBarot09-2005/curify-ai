import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import type { LoanCase, IntakeFormData, Hospital, ClinicalMapping, CaseStatus, CaseActivityItem } from '../types';
import { mockCases } from '../data/cases';
import { mockHospitals, mockClinicalMappings, resolveClinicalMapping, getHospitalsForMapping } from '../data/hospitals';
import { generateCaseId } from '../utils';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface AppState {
  cases: LoanCase[];
  currentIntake: IntakeFormData | null;
  currentMapping: ClinicalMapping | null;
  /** Server-side clinical mapping UUID (for API calls) */
  clinicalMappingId: string | null;
  selectedHospital: Hospital | null;
  hospitals: Hospital[];
  casesLoading: boolean;
  loanCompanies: any[];
  aiQuota: { used: number; limit: number; remaining: number } | null;
}

interface AppContextType extends AppState {
  setIntake: (data: IntakeFormData) => void;
  setMapping: (mapping: ClinicalMapping) => void;
  setClinicalMappingId: (id: string | null) => void;
  selectHospital: (hospital: Hospital) => void;
  getHospitals: () => Hospital[];
  finalizeCase: () => Promise<LoanCase | null>;
  updateCaseStatus: (caseId: string, status: CaseStatus, note?: string, reason?: string) => Promise<void>;
  addCaseNote: (caseId: string, noteText: string) => Promise<void>;
  addCaseActivity: (caseId: string, activity: Omit<CaseActivityItem, 'id'>) => void;
  getCaseById: (id: string) => LoanCase | undefined;
  getPatientCases: () => LoanCase[];
  resetIntake: () => void;
  refreshCases: () => Promise<void>;
  refreshQuota: () => Promise<void>;
  analyzeIntake: (intake: IntakeFormData) => Promise<ClinicalMapping>;
  matchHospitals: (mappingId: string, city?: string, budget?: number) => Promise<Hospital[]>;
  setHospitals: (hospitals: Hospital[]) => void;
  fetchLoanCompanies: () => Promise<void>;
  fetchEligibleCompanies: (caseId: string) => Promise<any[]>;
  sendOffers: (caseId: string, companyIds: string[]) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadCases(): LoanCase[] {
  // Lender demo users get mock cases from localStorage or defaults
  try {
    const userStored = sessionStorage.getItem('curify_demo_user') || localStorage.getItem('curify_user');
    if (userStored) {
      const u = JSON.parse(userStored);
      if (u?.role === 'lender') {
        const stored = localStorage.getItem('curify_cases_v2');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return [...mockCases];
          }
        }
        return [...mockCases];
      }
    }
  } catch {}
  // Patient users: NEVER load from localStorage — always wait for API
  // This prevents stale cases from previous sessions appearing for new users
  return [];
}

function saveCases(cases: LoanCase[]) {
  localStorage.setItem('curify_cases_v2', JSON.stringify(cases));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [cases, setCases] = useState<LoanCase[]>(loadCases);
  const [currentIntake, setCurrentIntake] = useState<IntakeFormData | null>(null);
  const [currentMapping, setCurrentMapping] = useState<ClinicalMapping | null>(null);
  const [clinicalMappingId, setClinicalMappingId] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [hospitalList, setHospitalList] = useState<Hospital[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loanCompanies, setLoanCompanies] = useState<any[]>([]);
  const [aiQuota, setAiQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  const refreshQuota = useCallback(async () => {
    try {
      const res = await api.clinical.getQuota();
      if (res && typeof res.used === 'number') {
        const limit = res.limit || 3;
        const used = res.used;
        const remaining = typeof res.remaining === 'number' ? res.remaining : Math.max(0, limit - used);
        setAiQuota({ used, limit, remaining });
      }
    } catch (err) {
      console.warn('[AppContext] Failed to refresh AI quota:', err);
    }
  }, []);

  // Load cases from API when authenticated; clear stale cases on user change
  useEffect(() => {
    if (isAuthenticated && user) {
      // Clear any stale cases first for patient users
      if (user.role === 'patient') {
        setCases([]);
      }
      refreshCasesFromApi();
      refreshQuota();
    } else {
      // Not authenticated — ensure clean slate
      setCases([]);
      setAiQuota(null);
      localStorage.removeItem('curify_cases_v2');
    }
  }, [isAuthenticated, user?.id, refreshQuota]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshCasesFromApi = useCallback(async () => {
    try {
      setCasesLoading(true);
      const apiCases = await api.cases.getCases();
      if (Array.isArray(apiCases)) {
        setCases(apiCases);
        saveCases(apiCases);
      }
    } catch (err) {
      console.warn('[AppContext] Failed to fetch cases from API, using local data:', err);
      // Keep existing local data
    } finally {
      setCasesLoading(false);
    }
  }, []);

  const refreshCases = useCallback(async () => {
    await refreshCasesFromApi();
  }, [refreshCasesFromApi]);

  const setIntake = useCallback((data: IntakeFormData) => {
    setCurrentIntake(data);
    // Also resolve local mapping for instant display
    const resolved = resolveClinicalMapping(data.query);
    setCurrentMapping(resolved);
    setHospitalList([]);
    setSelectedHospital(null);
  }, []);

  const setMapping = useCallback((mapping: ClinicalMapping) => {
    setCurrentMapping(mapping);
  }, []);

  const selectHospital = useCallback((hospital: Hospital) => {
    setSelectedHospital(hospital);
  }, []);

  const setHospitals = useCallback((newHospitals: Hospital[]) => {
    setHospitalList(newHospitals);
  }, []);

  // Compute procedurally tailored hospitals based on active clinical mapping (fallback)
  const hospitals = useMemo(() => {
    if (hospitalList.length > 0) return hospitalList;
    return getHospitalsForMapping(currentMapping, currentIntake?.location);
  }, [currentMapping, currentIntake?.location, hospitalList]);

  const getHospitals = useCallback(() => {
    return hospitals;
  }, [hospitals]);

  const resetIntake = useCallback(() => {
    setCurrentIntake(null);
    setCurrentMapping(null);
    setClinicalMappingId(null);
    setSelectedHospital(null);
    setHospitalList([]);
  }, []);

  /**
   * Calls the backend /api/clinical/analyze endpoint.
   * Falls back to local mock resolution if the server is unavailable.
   */
  const analyzeIntake = useCallback(async (intake: IntakeFormData): Promise<ClinicalMapping> => {
    if (intake.isManual && intake.manualMapping) {
      // Bypass API completely for manual forms
      setClinicalMappingId('manual-mapping');
      setCurrentMapping(intake.manualMapping);
      return intake.manualMapping;
    }

    try {
      const result = await api.clinical.analyze({
        query: intake.query,
        age: intake.age,
        gender: intake.gender,
        city: intake.location,
        comorbidities: intake.comorbidities ? intake.comorbidities.split(',').map(s => s.trim()) : undefined,
        budget: intake.budget,
      });

      // Store the server-side mapping ID for hospital matching
      setClinicalMappingId(result.id);

      let pathway: string[] = [];
      if (Array.isArray(result.potentialPathway)) {
        pathway = result.potentialPathway;
      } else if (typeof result.potentialPathway === 'string') {
        try {
          pathway = JSON.parse(result.potentialPathway);
        } catch {
          pathway = [result.potentialPathway];
        }
      }

      if (result?.quota && typeof result.quota.used === 'number') {
        const used = result.quota.used;
        const limit = result.quota.limit || 3;
        setAiQuota({ used, limit, remaining: Math.max(0, limit - used) });
      }

      const mapping: ClinicalMapping = {
        originalQuery: result.originalQuery || intake.query,
        primaryConcern: result.primaryConcern,
        clinicalCategory: result.clinicalCategory,
        icdCode: result.icdCode,
        potentialPathway: pathway.length > 0 ? pathway : ['Clinical Consultation', 'Diagnostic Evaluation', 'Treatment & Follow-up'],
        targetProcedure: result.targetProcedure,
        source: result.source,
      };
      setCurrentMapping(mapping);
      return mapping;
    } catch (err: any) {
      if (err?.status === 429) {
        setAiQuota(prev => ({
          used: prev?.limit || 3,
          limit: prev?.limit || 3,
          remaining: 0,
        }));
        throw err;
      }
      console.warn('[AppContext] Clinical analysis API failed, using local fallback:', err);
      const fallback = resolveClinicalMapping(intake.query);
      setCurrentMapping(fallback);
      return fallback;
    }
  }, []);

  /**
   * Calls the backend /api/hospitals/match endpoint.
   * Falls back to local mock hospitals if the server is unavailable.
   */
  const matchHospitals = useCallback(async (mappingId: string, city?: string, budget?: number): Promise<Hospital[]> => {
    try {
      const result = await api.hospitals.matchHospitals({
        mappingId,
        city,
        budget,
        targetProcedure: currentMapping?.targetProcedure,
        category: currentMapping?.clinicalCategory,
      });
      if (Array.isArray(result) && result.length > 0) {
        setHospitalList(result);
        return result;
      }
      throw new Error('Empty hospital results');
    } catch (err) {
      console.warn('[AppContext] Hospital matching API failed, using local fallback:', err);
      const fallbackHospitals = getHospitalsForMapping(currentMapping, city);
      setHospitalList(fallbackHospitals);
      return fallbackHospitals;
    }
  }, [currentMapping]);

  /**
   * Creates a treatment plan + loan case via the backend API.
   * Falls back to local case creation if the API is unreachable.
   */
  const finalizeCase = useCallback(async (): Promise<LoanCase | null> => {
    if (!currentIntake || !currentMapping || !selectedHospital) return null;

    try {
      // 1. Create treatment plan via API
      const treatmentPlan = await api.treatmentPlans.createPlan({
        clinicalMappingId: clinicalMappingId || 'local-mapping',
        hospitalId: selectedHospital.id,
        costBreakdown: selectedHospital.costBreakdown,
        status: 'FINALIZED',
      });

      // 2. Create loan case via API
      const avgCost = (selectedHospital.costBreakdown.totalMin + selectedHospital.costBreakdown.totalMax) / 2;
      const apiCase = await api.cases.createCase({
        treatmentPlanId: treatmentPlan.id,
        requestedAmount: Math.round(avgCost),
      });

      // 3. Refresh cases from server
      await refreshCasesFromApi();

      // Return the created case
      return apiCase;
    } catch (err) {
      console.warn('[AppContext] API finalize failed, creating local case:', err);

      // Fallback: create local case (same as before)
      const newCaseId = generateCaseId();
      const nowIso = new Date().toISOString();

      const initialActivities: CaseActivityItem[] = [
        {
          id: `act-${Date.now()}-1`,
          caseId: newCaseId,
          type: 'SUBMISSION',
          title: 'Case submitted',
          description: `Patient finalized the ${currentMapping.targetProcedure} treatment plan`,
          actor: user?.name || 'Patient',
          actorRole: 'Patient',
          timestamp: nowIso,
        },
        {
          id: `act-${Date.now()}-2`,
          caseId: newCaseId,
          type: 'QUEUE',
          title: 'Case entered underwriting queue',
          description: 'Status set to Pending Review',
          actor: 'Curify Engine',
          actorRole: 'System',
          timestamp: new Date(Date.now() + 1000 * 60).toISOString(),
        },
      ];

      const newCase: LoanCase = {
        id: newCaseId,
        createdAt: nowIso,
        status: 'Pending Review',
        patient: {
          name: user?.name || 'Patient',
          age: currentIntake.age || 48,
          gender: currentIntake.gender || 'Male',
          comorbidities: currentIntake.comorbidities
            ? currentIntake.comorbidities.split(',').map((s) => s.trim())
            : [],
          budget: currentIntake.budget,
        },
        clinicalMapping: currentMapping,
        hospital: {
          id: selectedHospital.id,
          name: selectedHospital.name,
          city: selectedHospital.city,
          accreditation: selectedHospital.accreditation || 'NABH',
          rating: selectedHospital.rating ?? 4.5,
        },
        costBreakdown: selectedHospital.costBreakdown,
        confidence: selectedHospital.confidence,
        activities: initialActivities,
      };

      const updatedCases = [newCase, ...cases];
      setCases(updatedCases);
      saveCases(updatedCases);
      return newCase;
    }
  }, [currentIntake, currentMapping, selectedHospital, clinicalMappingId, cases, user, refreshCasesFromApi]);

  const addCaseActivity = useCallback(
    (caseId: string, activity: Omit<CaseActivityItem, 'id'>) => {
      const updatedCases = cases.map((c) => {
        if (c.id === caseId) {
          const newAct: CaseActivityItem = {
            ...activity,
            id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          };
          return {
            ...c,
            activities: [...(c.activities || []), newAct],
          };
        }
        return c;
      });
      setCases(updatedCases);
      saveCases(updatedCases);
    },
    [cases],
  );

  const addCaseNote = useCallback(
    async (caseId: string, noteText: string) => {
      // Find the case to get its dbId (server UUID)
      const targetCase = cases.find(c => c.id === caseId || (c as any).dbId === caseId);
      const dbId = (targetCase as any)?.dbId || caseId;

      const newAct: CaseActivityItem = {
        id: `act-${Date.now()}`,
        caseId,
        type: 'NOTE',
        title: 'Review note added',
        note: noteText,
        actor: user?.name || 'Neha Kapoor',
        actorRole: 'Senior Underwriter',
        timestamp: new Date().toISOString(),
      };

      const updatedCases = cases.map((c) => {
        if (c.id === caseId || (c as any).dbId === caseId) {
          return {
            ...c,
            activities: [...(c.activities || []), newAct],
          };
        }
        return c;
      });
      setCases(updatedCases);
      saveCases(updatedCases);

      try {
        await api.cases.addNote(dbId, { note: noteText });
        await refreshCasesFromApi();
      } catch (err) {
        console.warn('[AppContext] API addNote failed, maintained local update:', err);
      }
    },
    [cases, user, refreshCasesFromApi],
  );

  const updateCaseStatus = useCallback(
    async (caseId: string, status: CaseStatus, note?: string, reason?: string) => {
      const targetCase = cases.find(c => c.id === caseId || (c as any).dbId === caseId);
      const dbId = (targetCase as any)?.dbId || caseId;

      const nowIso = new Date().toISOString();
      let decisionTitle = `Status changed to ${status}`;
      let actType: CaseActivityItem['type'] = 'STATUS_CHANGE';

      if (status === 'Approved') {
        decisionTitle = 'Case approved';
        actType = 'DECISION';
      } else if (status === 'Needs Review') {
        decisionTitle = 'Case marked as Needs Review';
        actType = 'DECISION';
      } else if (status === 'Rejected') {
        decisionTitle = 'Case rejected';
        actType = 'DECISION';
      }

      const newAct: CaseActivityItem = {
        id: `act-${Date.now()}`,
        caseId,
        type: actType,
        title: decisionTitle,
        description: status === 'Approved' ? 'Financing case approved.' : undefined,
        reason: reason || (status === 'Needs Review' ? 'Cost estimate verification' : undefined),
        note: note,
        decision: status === 'Approved' ? 'Approved' : undefined,
        actor: user?.name || 'Neha Kapoor',
        actorRole: 'Senior Underwriter',
        timestamp: nowIso,
      };

      const updatedCases = cases.map((c) => {
        if (c.id === caseId || (c as any).dbId === caseId) {
          return {
            ...c,
            status,
            ...(status === 'Needs Review' && note ? { reviewNote: note } : {}),
            ...(status === 'Rejected' && (reason || note) ? { rejectionReason: reason || note } : {}),
            activities: [...(c.activities || []), newAct],
          };
        }
        return c;
      });
      setCases(updatedCases);
      saveCases(updatedCases);

      try {
        if (status === 'Approved') {
          const avgCost = targetCase
            ? (targetCase.costBreakdown.totalMin + targetCase.costBreakdown.totalMax) / 2
            : 160000;
          await api.cases.approveCase(dbId, {
            approvedAmount: Math.round(avgCost),
            decisionComment: note || 'Approved after review',
          });
        } else if (status === 'Rejected') {
          await api.cases.rejectCase(dbId, {
            reason: reason || note || 'Rejected by underwriter',
          });
        } else if (status === 'Needs Review') {
          await api.cases.reviewCase(dbId, {
            reviewNote: note || reason || 'Flagged for review',
          });
        }
        await refreshCasesFromApi();
      } catch (err) {
        console.warn('[AppContext] API status update error, maintained local update:', err);
      }
    },
    [cases, user, refreshCasesFromApi],
  );

  const getCaseById = useCallback(
    (id: string) => {
      return cases.find((c) => c.id === id || (c as any).dbId === id);
    },
    [cases],
  );

  const getPatientCases = useCallback(() => {
    if (!user || user.role !== 'patient') return [];
    return cases.filter((c) => {
      return (c as any).patientId === user.id;
    });
  }, [cases, user]);

  const fetchLoanCompanies = useCallback(async () => {
    try {
      const data = await api.loanCompanies.getCompanies();
      setLoanCompanies(data);
    } catch (err) {
      console.warn('Failed to fetch loan companies', err);
    }
  }, []);

  const fetchEligibleCompanies = useCallback(async (caseId: string) => {
    try {
      return await api.loanOffers.getEligibleCompanies(caseId);
    } catch (err) {
      console.warn('Failed to fetch eligible companies', err);
      return [];
    }
  }, []);

  const sendOffers = useCallback(async (caseId: string, companyIds: string[]) => {
    try {
      const res = await api.loanOffers.createOffers(caseId, { companyIds });
      await refreshCasesFromApi();
      return res;
    } catch (err) {
      console.warn('Failed to send offers', err);
      throw err;
    }
  }, [refreshCasesFromApi]);

  return (
    <AppContext.Provider
      value={{
        cases,
        currentIntake,
        currentMapping,
        clinicalMappingId,
        selectedHospital,
        hospitals,
        casesLoading,
        loanCompanies,
        aiQuota,
        setIntake,
        setMapping,
        setClinicalMappingId,
        selectHospital,
        getHospitals,
        finalizeCase,
        updateCaseStatus,
        addCaseNote,
        addCaseActivity,
        getCaseById,
        getPatientCases,
        resetIntake,
        refreshCases,
        refreshQuota,
        analyzeIntake,
        matchHospitals,
        setHospitals,
        fetchLoanCompanies,
        fetchEligibleCompanies,
        sendOffers,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { mockClinicalMappings, resolveClinicalMapping, getHospitalsForMapping };
