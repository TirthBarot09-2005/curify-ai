import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Search,
  FileText,
  Clock,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Activity,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const navItems = [
  { to: '/patient', icon: Home, label: 'Overview', end: true },
  { to: '/patient/intake', icon: Search, label: 'Find Care & Costs', end: false },
  { to: '/patient/plan', icon: FileText, label: 'Treatment Plans', end: false },
  { to: '/patient/history', icon: Clock, label: 'History & Cases', end: false },
];

export default function PatientLayout() {
  const { user, logout, loggingOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus-visible:outline-none cursor-pointer"
            >
              <Activity className="w-7 h-7 text-teal-600" />
              <div className="text-left">
                <span className="text-lg font-bold text-navy-900 tracking-tight block leading-none">
                  Curify <span className="text-teal-600">AI</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                  Patient Portal
                </span>
              </div>
            </button>

            {/* Center nav */}
            <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-navy-900 shadow-xs'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-white/50'
                    }`
                  }
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50/80 border border-teal-200/50 text-[11px] font-medium text-teal-800">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Ahmedabad, GJ
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-navy-900 text-teal-300 flex items-center justify-center text-xs font-bold shadow-xs">
                    {user?.name?.charAt(0) || 'P'}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-800">{user?.name || 'Patient'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 animate-modal-in z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">{user?.name || 'Patient'}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email || 'patient@curify.ai'}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 rounded-full border border-teal-200/60">
                        Verified Patient
                      </span>
                    </div>
                    <button
                      onClick={() => { navigate('/patient/profile'); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Profile & Medical Preferences
                    </button>
                    <button
                      onClick={() => { navigate('/patient/history'); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      Previous Consultations & Cases
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => { setMenuOpen(false); logout({ isPatient: true }); }}
                      disabled={loggingOut}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors text-left ${
                        loggingOut
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-rose-600 hover:bg-rose-50/60'
                      }`}
                    >
                      <LogOut className={`w-4 h-4 ${loggingOut ? 'animate-spin' : ''}`} />
                      {loggingOut ? 'Signing out\u2026' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-4 py-2 bg-slate-50/90 border-t border-slate-200/60 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      {/* Persistent Patient Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer focus-visible:outline-none">
            <Activity className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-slate-700">Curify AI Healthcare Platform</span>
            <span>· Decision Support & Financial Planning</span>
          </button>
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            Not a medical diagnostic tool. All estimates subject to formal clinical assessment.
          </p>
        </div>
      </footer>
    </div>
  );
}
