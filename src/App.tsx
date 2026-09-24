import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';

// Patient pages
import PatientLayout from './layouts/PatientLayout';
import PatientDashboard from './pages/patient/Dashboard';
import PatientIntake from './pages/patient/Intake';
import PatientAnalysis from './pages/patient/Analysis';
import PatientHospitals from './pages/patient/Hospitals';
import HospitalDetails from './pages/patient/HospitalDetails';
import TreatmentPlan from './pages/patient/Plan';
import PatientCase from './pages/patient/Case';
import PatientHistory from './pages/patient/History';
import PatientProfile from './pages/patient/profile';
import PatientOnboarding from './pages/patient/Onboarding';

// Lender pages
import LenderLayout from './layouts/LenderLayout';
import LenderDashboard from './pages/lender/Dashboard';
import LenderCases from './pages/lender/Cases';
import LenderCaseDetails from './pages/lender/CaseDetails';
import LenderCompanies from './pages/lender/Companies';
import LenderAnalytics from './pages/lender/Analytics';
import LenderDisbursements from './pages/lender/Disbursements';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-teal-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to={`/${user?.role}`} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
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
            <PatientOnboarding />
          </ProtectedRoute>
        }
      />

      {/* Patient */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute role="patient">
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientDashboard />} />
        <Route path="intake" element={<PatientIntake />} />
        <Route path="analysis" element={<PatientAnalysis />} />
        <Route path="hospitals" element={<PatientHospitals />} />
        <Route path="hospitals/:id" element={<HospitalDetails />} />
        <Route path="plan" element={<TreatmentPlan />} />
        <Route path="case" element={<PatientCase />} />
        <Route path="history" element={<PatientHistory />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      {/* Lender */}
      <Route
        path="/lender"
        element={
          <ProtectedRoute role="lender">
            <LenderLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LenderDashboard />} />
        <Route path="cases" element={<LenderCases />} />
        <Route path="cases/:id" element={<LenderCaseDetails />} />
        <Route path="companies" element={<LenderCompanies />} />
        <Route path="analytics" element={<LenderAnalytics />} />
        <Route path="disbursements" element={<LenderDisbursements />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
