import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import PatientAuthOverlay from './components/PatientAuthOverlay';
import SEOHead from './components/SEOHead';

// Public pages — eagerly loaded for SEO / fast first paint
import Landing from './pages/Landing';
import Login from './pages/Login';

// Protected pages — lazy-loaded to reduce initial bundle size
// These are behind authentication so search engines never need them
const PatientLayout = lazy(() => import('./layouts/PatientLayout'));
const PatientDashboard = lazy(() => import('./pages/patient/Dashboard'));
const PatientIntake = lazy(() => import('./pages/patient/Intake'));
const PatientAnalysis = lazy(() => import('./pages/patient/Analysis'));
const PatientHospitals = lazy(() => import('./pages/patient/Hospitals'));
const HospitalDetails = lazy(() => import('./pages/patient/HospitalDetails'));
const TreatmentPlan = lazy(() => import('./pages/patient/Plan'));
const PatientCase = lazy(() => import('./pages/patient/Case'));
const PatientHistory = lazy(() => import('./pages/patient/History'));
const PatientProfile = lazy(() => import('./pages/patient/profile'));
const PatientOnboarding = lazy(() => import('./pages/patient/Onboarding'));
const LenderLayout = lazy(() => import('./layouts/LenderLayout'));
const LenderDashboard = lazy(() => import('./pages/lender/Dashboard'));
const LenderCases = lazy(() => import('./pages/lender/Cases'));
const LenderCaseDetails = lazy(() => import('./pages/lender/CaseDetails'));
const LenderCompanies = lazy(() => import('./pages/lender/Companies'));
const LenderAnalytics = lazy(() => import('./pages/lender/Analytics'));
const LenderDisbursements = lazy(() => import('./pages/lender/Disbursements'));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-teal-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );
}

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, user, loading } = useAuth();

  // Only show the loading spinner on initial app boot when we have no user yet.
  // If the user is already authenticated (e.g. Login.tsx set user state before
  // syncWithBackend finished), skip the spinner to avoid a dark flash.
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-teal-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to={`/${user?.role}`} replace />;
  return (
    <>
      <SEOHead
        title="Dashboard"
        description="Curify AI dashboard — manage your healthcare decisions."
        canonicalPath="/"
        noIndex={true}
      />
      {children}
    </>
  );
}

export default function App() {
  return (
    <>
      <PatientAuthOverlay />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login />} />

        {/* Patient Onboarding (Focused Fullscreen Flow) */}
        <Route
          path="/patient/onboarding"
          element={
            <ProtectedRoute role="patient">
              <Suspense fallback={<LazyFallback />}>
                <PatientOnboarding />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Patient */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute role="patient">
              <Suspense fallback={<LazyFallback />}>
                <PatientLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<Suspense fallback={<LazyFallback />}><PatientDashboard /></Suspense>} />
          <Route path="intake" element={<Suspense fallback={<LazyFallback />}><PatientIntake /></Suspense>} />
          <Route path="analysis" element={<Suspense fallback={<LazyFallback />}><PatientAnalysis /></Suspense>} />
          <Route path="hospitals" element={<Suspense fallback={<LazyFallback />}><PatientHospitals /></Suspense>} />
          <Route path="hospitals/:id" element={<Suspense fallback={<LazyFallback />}><HospitalDetails /></Suspense>} />
          <Route path="plan" element={<Suspense fallback={<LazyFallback />}><TreatmentPlan /></Suspense>} />
          <Route path="case" element={<Suspense fallback={<LazyFallback />}><PatientCase /></Suspense>} />
          <Route path="history" element={<Suspense fallback={<LazyFallback />}><PatientHistory /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<LazyFallback />}><PatientProfile /></Suspense>} />
        </Route>

        {/* Lender */}
        <Route
          path="/lender"
          element={
            <ProtectedRoute role="lender">
              <Suspense fallback={<LazyFallback />}>
                <LenderLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<Suspense fallback={<LazyFallback />}><LenderDashboard /></Suspense>} />
          <Route path="cases" element={<Suspense fallback={<LazyFallback />}><LenderCases /></Suspense>} />
          <Route path="cases/:id" element={<Suspense fallback={<LazyFallback />}><LenderCaseDetails /></Suspense>} />
          <Route path="companies" element={<Suspense fallback={<LazyFallback />}><LenderCompanies /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<LazyFallback />}><LenderAnalytics /></Suspense>} />
          <Route path="disbursements" element={<Suspense fallback={<LazyFallback />}><LenderDisbursements /></Suspense>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

