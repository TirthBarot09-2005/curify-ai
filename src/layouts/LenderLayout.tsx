import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  FileStack,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings,
  LogOut,
  Activity,
  ChevronDown,
  User,
  Shield,
  Building2,
  TrendingUp,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const sidebarItems = [
  { to: '/lender', icon: LayoutDashboard, label: 'Marketplace Console', end: true },
  { to: '/lender/cases', icon: FileStack, label: 'All Loan Cases', end: true },
  { to: '/lender/companies', icon: Building2, label: 'Lending Partners', end: true },
  { to: '/lender/analytics', icon: TrendingUp, label: 'Analytics', end: true },
  { to: '/lender/disbursements', icon: DollarSign, label: 'Disbursements', end: true },
];

export default function LenderLayout() {
  const { user, logout, loggingOut } = useAuth();
  const { cases } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pending = cases.filter((c) => c.status === 'Pending Review').length;
  const needsReview = cases.filter((c) => c.status === 'Needs Review').length;
  const approved = cases.filter((c) => c.status === 'Approved').length;
  const rejected = cases.filter((c) => c.status === 'Rejected').length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const statusFilters = [
    { to: '/lender/cases?status=pending', icon: Clock, label: 'Pending Review', count: pending, color: 'text-sky-400' },
    { to: '/lender/cases?status=needs-review', icon: AlertCircle, label: 'Needs Review', count: needsReview, color: 'text-amber-400' },
    { to: '/lender/cases?status=approved', icon: CheckCircle2, label: 'Approved', count: approved, color: 'text-emerald-400' },
    { to: '/lender/cases?status=rejected', icon: XCircle, label: 'Rejected', count: rejected, color: 'text-rose-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-100/60 flex">
      {/* Dark Professional Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy-900 text-white fixed inset-y-0 left-0 z-30 border-r border-navy-800 shadow-xl">
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left cursor-pointer focus-visible:outline-none"
          >
            <Activity className="w-6 h-6 text-teal-400" />
            <div>
              <span className="text-base font-bold tracking-tight block leading-none">
                Curify <span className="text-teal-400">AI</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                Underwriting Portal
              </span>
            </div>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Main Views</p>
          </div>
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white/15 text-white shadow-xs border border-white/10'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-4 h-4 text-teal-400" />
              {item.label}
            </NavLink>
          ))}

          <div className="pt-6 pb-2 px-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queue Queues</p>
          </div>
          {statusFilters.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                  location.search === item.to.split('?')[1] || (location.pathname === '/lender/cases' && isActive)
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <span className="flex items-center gap-2.5">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                {item.label}
              </span>
              <span className="text-[11px] font-bold bg-white/10 px-2 py-0.5 rounded-full tabular-nums">
                {item.count}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Security badge at bottom */}
        <div className="p-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>Encrypted B2B Underwriting Channel</span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile logo */}
            <button
              onClick={() => navigate('/')}
              className="lg:hidden flex items-center gap-2 text-left cursor-pointer focus-visible:outline-none hover:opacity-80 transition-opacity"
            >
              <Activity className="w-6 h-6 text-teal-600" />
              <div>
                <span className="text-base font-bold text-navy-900 leading-none block">
                  Curify <span className="text-teal-600">AI</span>
                </span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Lender Desk</span>
              </div>
            </button>

            {/* Title / Context on desktop */}
            <div className="hidden lg:block">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Healthcare Financing Desk</span>
              <h1 className="text-sm font-bold text-navy-900">Medical Loan Case Review & Decisioning</h1>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-lg bg-navy-900 text-teal-400 flex items-center justify-center text-xs font-bold shadow-xs">
                  {user?.name?.charAt(0) || 'N'}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">{user?.name || 'Neha Sharma'}</span>
                  <span className="text-[10px] font-medium text-slate-500 block">Senior Underwriter</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 animate-modal-in z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{user?.name || 'Neha Sharma'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email || 'underwriter@carefin.example.com'}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-navy-900 text-teal-300 rounded-full">
                      Lender / Insurer
                    </span>
                  </div>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
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

          {/* Mobile nav */}
          <nav className="lg:hidden flex items-center gap-1 px-4 py-2 bg-slate-50 border-t border-slate-200/60 overflow-x-auto">
            {sidebarItems.map((item) => (
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

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
