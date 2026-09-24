/**
 * Curify AI Centralized API Client
 * Handles authentication headers, error management, and typed backend communication
 */

export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

function getToken(): string | null {
  return localStorage.getItem('curify_token');
}

export function setToken(token: string) {
  localStorage.setItem('curify_token', token);
}

export function removeToken() {
  localStorage.removeItem('curify_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token: string | null = null;
  if (tokenGetter) {
    try {
      token = await tokenGetter();
    } catch {
      // Fallback to cached token
    }
  }
  if (!token) {
    token = getToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Check if demo lender role is active in sessionStorage or localStorage
    try {
      const stored = sessionStorage.getItem('curify_demo_user') || localStorage.getItem('curify_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.role === 'lender') {
          headers['x-demo-role'] = 'lender';
        }
      }
    } catch {
      // Ignore parse error
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = json.message || response.statusText || 'API request failed';
    const err = new Error(errorMsg) as Error & { status?: number; errors?: any[] };
    err.status = response.status;
    err.errors = json.errors;
    throw err;
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: { email: string; password: string; role: string; firstName: string; lastName: string; phone?: string }) =>
      request<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () =>
      request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      }),
    getMe: () => request<any>('/auth/me'),
    sync: (data: { role?: string; firstName?: string; lastName?: string; phone?: string }) =>
      request<any>('/auth/sync', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    completeSignup: (data: {
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      role?: string;
      phone?: string;
    }) =>
      request<{ token: string; user: any }>('/auth/complete-signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  onboarding: {
    getState: () => request<any>('/onboarding'),
    updateState: (data: any) =>
      request<any>('/onboarding', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  patient: {
    getProfile: () => request<any>('/patient/profile'),
    updateProfile: (data: any) =>
      request<any>('/patient/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    savedHospitals: {
      get: () => request<any[]>('/patient/saved-hospitals'),
      add: (hospitalId: string) =>
        request<any>('/patient/saved-hospitals', {
          method: 'POST',
          body: JSON.stringify({ hospitalId }),
        }),
      remove: (hospitalId: string) =>
        request<any>(`/patient/saved-hospitals/${hospitalId}`, {
          method: 'DELETE',
        }),
    },
    documents: {
      get: () => request<any[]>('/patient/documents'),
      add: (data: any) =>
        request<any>('/patient/documents', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      remove: (documentId: string) =>
        request<any>(`/patient/documents/${documentId}`, {
          method: 'DELETE',
        }),
    },
  },

  lender: {
    getProfile: () => request<any>('/lender/profile'),
    getDashboard: () => request<any>('/lender/dashboard'),
  },

  clinical: {
    getQuota: () => request<{ used: number; limit: number; remaining: number; resetAt: string }>('/clinical/quota'),
    analyze: (input: { query: string; age?: number; gender?: string; city?: string; comorbidities?: string[]; budget?: number }) =>
      request<any>('/clinical/analyze', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },

  hospitals: {
    getHospitals: (params?: { city?: string; accreditation?: string; minRating?: number; sort?: string }) => {
      const q = new URLSearchParams();
      if (params?.city) q.set('city', params.city);
      if (params?.accreditation) q.set('accreditation', params.accreditation);
      if (params?.minRating) q.set('minRating', params.minRating.toString());
      if (params?.sort) q.set('sort', params.sort);
      return request<any[]>(`/hospitals?${q.toString()}`);
    },
    getHospitalById: (id: string) => request<any>(`/hospitals/${id}`),
    matchHospitals: (data: { mappingId: string; city?: string; budget?: number; targetProcedure?: string; category?: string }) =>
      request<any[]>('/hospitals/match', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  treatmentPlans: {
    createPlan: (data: { clinicalMappingId: string; hospitalId: string; costBreakdown: any; status?: string }) =>
      request<any>('/treatment-plans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPlans: () => request<any[]>('/treatment-plans'),
    getPlanById: (id: string) => request<any>(`/treatment-plans/${id}`),
    finalizePlan: (id: string) =>
      request<any>(`/treatment-plans/${id}/finalize`, {
        method: 'PUT',
      }),
  },

  cases: {
    createCase: (data: { treatmentPlanId: string; requestedAmount: number }) =>
      request<any>('/cases', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCases: (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      return request<any[]>(`/cases?${q.toString()}`);
    },
    getCaseById: (id: string) => request<any>(`/cases/${id}`),
    approveCase: (id: string, data: { approvedAmount: number; decisionComment: string }) =>
      request<any>(`/cases/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    rejectCase: (id: string, data: { reason: string }) =>
      request<any>(`/cases/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reviewCase: (id: string, data: { reviewNote: string }) =>
      request<any>(`/cases/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addNote: (id: string, data: { note: string }) =>
      request<any>(`/cases/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getAuditLogs: (id: string) => request<any[]>(`/cases/${id}/audit`),
    getCaseEvents: (id: string) => request<any[]>(`/cases/${id}/events`),
  },

  reports: {
    getPdfUrl: (caseId: string) => `${API_BASE}/reports/${caseId}/pdf`,
    downloadPdf: async (caseId: string, openInNewTab = false) => {
      let token: string | null = null;
      if (tokenGetter) {
        try {
          token = await tokenGetter();
        } catch {
          // fallback
        }
      }
      if (!token) {
        token = getToken();
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        try {
          const stored = sessionStorage.getItem('curify_demo_user') || localStorage.getItem('curify_user');
          if (stored) {
            const u = JSON.parse(stored);
            if (u?.role === 'lender') {
              headers['x-demo-role'] = 'lender';
            }
          }
        } catch {
          // ignore
        }
      }

      const res = await fetch(`${API_BASE}/reports/${caseId}/pdf`, { headers });
      if (!res.ok) {
        let errorMsg = 'Failed to download PDF report';
        try {
          const data = await res.json();
          if (data?.message) errorMsg = data.message;
        } catch {}
        throw new Error(errorMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      if (openInNewTab) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `curify-dossier-${caseId}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
      }
    },
  },
  loanCompanies: {
    getCompanies: () => request<any[]>('/loan-companies'),
    createCompany: (data: any) =>
      request<any>('/loan-companies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateCompany: (id: string, data: any) =>
      request<any>(`/loan-companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getPerformance: (id: string) => request<any>(`/loan-companies/${id}/performance`),
  },

  loanOffers: {
    getOffersByCaseId: (caseId: string) => request<any[]>(`/loan-offers/case/${caseId}`),
    getEligibleCompanies: (caseId: string) => request<any[]>(`/loan-offers/case/${caseId}/eligible-companies`),
    createOffers: (caseId: string, data: { companyIds: string[] }) =>
      request<any[]>(`/loan-offers/case/${caseId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    selectOffer: (id: string, data: { caseId: string }) =>
      request<any>(`/loan-offers/${id}/select`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateDecision: (id: string, data: { status: string; caseId: string }) =>
      request<any>(`/loan-offers/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
