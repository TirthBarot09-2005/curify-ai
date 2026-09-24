import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Search,
  GitCompareArrows,
  Building2,
  DollarSign,
  Shield,
  ArrowRight,
  CheckCircle2,
  Users,
  BarChart3,
  FileText,
  Star,
  Sparkles,
  MapPin,
  Heart,
  TrendingUp,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────
   Scroll-triggered animation hook
   ────────────────────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ──────────────────────────────────────────────────────────
   Animated counter for numbers
   ────────────────────────────────────────────────────────── */
function AnimatedNumber({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const { ref, visible } = useInView(0.5);
  useEffect(() => {
    if (!visible) return;
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(ease * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, value]);
  return <span ref={ref}>{prefix}{display.toLocaleString('en-IN')}{suffix}</span>;
}

/* ──────────────────────────────────────────────────────────
   Floating UI cards for hero composition
   ────────────────────────────────────────────────────────── */
function HeroMatchCard({ visible }: { visible: boolean }) {
  return (
    <div
      className="landing-float-card landing-float-match"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.6s ease-out 0.8s, transform 0.6s ease-out 0.8s',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hospital Match</span>
        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">94%</span>
      </div>
      <p className="text-sm font-semibold text-slate-900">Apollo Hospitals</p>
      <div className="flex items-center gap-1.5 mt-1">
        <MapPin className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-500">Ahmedabad</span>
      </div>
      <p className="text-[11px] text-slate-400 mt-2 tabular-nums">₹1.25L – ₹1.55L</p>
    </div>
  );
}

function HeroConfidenceCard({ visible }: { visible: boolean }) {
  return (
    <div
      className="landing-float-card landing-float-confidence"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.6s ease-out 1.1s, transform 0.6s ease-out 1.1s',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-white">82%</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-emerald-800">High confidence</p>
          <p className="text-[10px] text-emerald-600">Recommendation score</p>
        </div>
      </div>
    </div>
  );
}

function HeroCostCard({ visible }: { visible: boolean }) {
  return (
    <div
      className="landing-float-card landing-float-cost"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.6s ease-out 1.4s, transform 0.6s ease-out 1.4s',
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Treatment Estimate</span>
      <p className="text-base font-bold text-navy-900 tabular-nums mt-1">₹1,28,000 – ₹1,54,000</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Landing Page
   ────────────────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('how-it-works');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['how-it-works', 'for-patients', 'for-lenders', 'why-curify'];
      const scrollPosition = window.scrollY + 220;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      if (window.scrollY < 200) {
        setActiveSection('');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navLinks = [
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'for-patients', label: 'For Patients' },
    { id: 'for-lenders', label: 'For Lenders' },
    { id: 'why-curify', label: 'Why Curify' },
  ];

  const heroVis = useInView(0.1);
  const previewVis = useInView(0.15);
  const howVis = useInView(0.1);
  const costVis = useInView(0.15);
  const benefitsVis = useInView(0.1);
  const lenderVis = useInView(0.15);
  const aiVis = useInView(0.15);

  return (
    <div className="min-h-screen bg-white">
      {/* ═══ Nav ═══ */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Left: Brand */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity text-left cursor-pointer focus-visible:outline-none flex-shrink-0"
            aria-label="Curify AI Home"
          >
            <Activity className="w-7 h-7 text-teal-600" />
            <span className="text-lg font-semibold text-navy-900 tracking-tight">
              Curify <span className="text-teal-600">AI</span>
            </span>
          </button>

          {/* Center: Navigation Group with Underline Indicators */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-3">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className={`relative py-2 px-3.5 text-sm font-medium transition-colors group cursor-pointer focus-visible:outline-none ${isActive ? 'text-teal-700 font-semibold' : 'text-slate-600 hover:text-navy-900'
                    }`}
                >
                  <span className="relative z-10">{link.label}</span>
                  {/* Underline indicator */}
                  <span
                    className={`absolute left-2.5 right-2.5 bottom-0 h-[2px] bg-teal-600 rounded-full transition-transform duration-200 ease-out origin-center ${isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 group-hover:scale-x-100 opacity-80'
                      }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </nav>

          {/* Right: CTA actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/${user.role}`)}
                  className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 flex items-center gap-1.5"
                >
                  Dashboard ({user.role === 'lender' ? 'Lender' : 'Patient'})
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login?mode=login');
                  }}
                  className="btn-ghost text-xs text-slate-500 hover:text-red-600 px-2 py-1"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => navigate('/login?mode=login')} className="btn-ghost text-sm">
                  Sign in
                </button>
                <button onClick={() => navigate('/login?mode=signup')} className="btn-primary text-sm">
                  Get started
                </button>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu sheet */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/98 backdrop-blur-md px-4 py-3 space-y-1 shadow-lg animate-fadeIn">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${isActive
                    ? 'text-teal-700 bg-teal-50/70 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ═══ Hero ═══ */}
      <section className="pt-28 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left — text */}
          <div
            className="max-w-xl"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(16px)',
              transition: 'opacity 0.7s ease-out 0.1s, transform 0.7s ease-out 0.1s',
            }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold text-navy-900 tracking-tight leading-[1.1] text-balance">
              Healthcare decisions, made clearer.
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed text-balance">
              Curify AI helps you discover suitable hospitals, understand treatment costs, and
              prepare financially before making important healthcare decisions.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
              <button
                onClick={() => navigate(isAuthenticated && user ? `/${user.role}` : '/login?mode=signup')}
                className="btn-primary text-base px-8 py-3.5 flex items-center gap-2"
              >
                Explore your options
                <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#how-it-works" className="btn-secondary text-base px-8 py-3.5">
                See how it works
              </a>
            </div>
          </div>

          {/* Right — hero visual composition */}
          <div
            ref={heroVis.ref}
            className="landing-hero-visual"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateX(24px)',
              transition: 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s',
            }}
          >
            <div className="landing-hero-img-frame">
              <img
                src="/images/hero-healthcare.jpg"
                alt="Patient consulting with a healthcare professional in a modern clinic"
                className="landing-hero-img"
                loading="eager"
              />
              {/* Subtle gradient overlay at bottom for card integration */}
              <div className="landing-hero-img-fade" />
            </div>

            {/* Floating Curify UI cards */}
            <HeroMatchCard visible={heroVis.visible} />
            <HeroConfidenceCard visible={heroVis.visible} />
            <HeroCostCard visible={heroVis.visible} />
          </div>
        </div>
      </section>

      {/* ═══ Product Preview — enhanced visual ═══ */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div
          ref={previewVis.ref}
          className="landing-product-preview"
          style={{
            opacity: previewVis.visible ? 1 : 0,
            transform: previewVis.visible ? 'none' : 'translateY(24px)',
            transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
          }}
        >
          {/* Browser chrome mockup */}
          <div className="landing-browser-chrome">
            <div className="landing-browser-dots">
              <span /><span /><span />
            </div>
            <div className="landing-browser-url">
              <span>curify.ai/analysis</span>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {/* Flow pipeline */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {['Query', 'Clinical Mapping', 'Hospital Match', 'Cost Estimate'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${i === 0 ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                    }`}>{s}</span>
                  {i < 3 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Query */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Search className="w-3.5 h-3.5" />
                  Healthcare Query
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-700 italic">
                    "I need a knee replacement under ₹1.6 lakh in Ahmedabad"
                  </p>
                </div>
                <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                  <p className="text-xs font-medium text-teal-700 mb-1">Mapped Clinical Category</p>
                  <p className="text-sm font-semibold text-teal-900">Orthopedic — Joint Replacement</p>
                  <p className="text-xs text-teal-600 mt-1">ICD-10: M17.1</p>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Recommended Hospital</p>
                      <p className="font-semibold text-slate-900">Apollo Hospitals</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">NABH</span>
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          4.7
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-medium bg-teal-50 text-teal-700 px-2 py-1 rounded-full">94% match</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">Estimated Treatment Cost</p>
                  <p className="text-xl font-bold text-navy-900 tabular-nums">₹1,28,000 – ₹1,56,000</p>
                </div>

                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">82%</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">High Confidence</p>
                    <p className="text-xs text-emerald-600">Recommendation confidence score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Trust Statement ═══ */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-3xl sm:text-4xl font-semibold text-navy-900 tracking-tight leading-snug text-balance">
            From "What should I do?" to "Here's what it may cost."
          </p>
          <p className="mt-4 text-lg text-slate-500">
            Understand your healthcare options with structured, transparent cost information.
          </p>
        </div>
      </section>

      {/* ═══ How it Works — visual storytelling ═══ */}
      <section id="how-it-works" className="py-20 px-4 max-w-7xl mx-auto scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-semibold text-navy-900 tracking-tight">How Curify works</h2>
          <p className="mt-3 text-lg text-slate-500">Four steps to clearer healthcare decisions</p>
        </div>

        <div ref={howVis.ref} className="space-y-16 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-0">
          {[
            {
              icon: Search,
              step: '01',
              title: 'Tell us what you need',
              desc: 'Describe your symptoms, procedure, or healthcare requirement in your own words.',
              visual: (
                <div className="landing-step-visual">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400">Healthcare query</span>
                    </div>
                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "I need a knee replacement under ₹1.6L"
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500">Ahmedabad, Gujarat</span>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              icon: GitCompareArrows,
              step: '02',
              title: 'Understand your options',
              desc: 'We map your query to relevant clinical categories and identify potential treatment pathways.',
              visual: (
                <div className="landing-step-visual">
                  <div className="space-y-2">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-500">
                      Input: "knee replacement"
                    </div>
                    <div className="flex justify-center">
                      <div className="w-px h-4 bg-teal-300" />
                    </div>
                    <div className="p-2 bg-teal-50 rounded border border-teal-100">
                      <p className="text-[10px] font-medium text-teal-700">Orthopedic — Joint Replacement</p>
                      <p className="text-[9px] text-teal-600 mt-0.5">ICD-10: M17.1</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-px h-4 bg-teal-300" />
                    </div>
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                      <p className="text-[10px] font-medium text-emerald-700">Total Knee Arthroplasty</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              icon: DollarSign,
              step: '03',
              title: 'Compare estimated costs',
              desc: 'See componentized cost breakdowns across matched hospitals with confidence scores.',
              visual: (
                <div className="landing-step-visual">
                  <div className="space-y-1.5">
                    {[
                      { name: 'Apollo Hospitals', match: '94%', cost: '₹1.28L', accent: true },
                      { name: 'Sterling Hospital', match: '89%', cost: '₹1.18L', accent: false },
                      { name: 'Zydus Hospital', match: '86%', cost: '₹1.35L', accent: false },
                    ].map((h) => (
                      <div key={h.name} className={`p-2 rounded border text-[10px] flex items-center justify-between ${h.accent ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <div>
                          <p className="font-medium text-slate-800">{h.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-teal-600 font-medium">{h.match}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{h.cost}</span>
                          </div>
                        </div>
                        {h.accent && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              icon: FileText,
              step: '04',
              title: 'Finalize your treatment plan',
              desc: 'Select your preferred option and generate a structured healthcare financing case.',
              visual: (
                <div className="landing-step-visual">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Hospital</span>
                        <span className="font-medium text-slate-800">Apollo Hospitals</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Treatment</span>
                        <span className="font-medium text-slate-800">Knee Replacement</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Estimate</span>
                        <span className="font-bold text-navy-900">₹1.28L – ₹1.54L</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Confidence</span>
                        <span className="font-medium text-emerald-600">82%</span>
                      </div>
                      <div className="pt-1.5 mt-1 border-t border-slate-100">
                        <div className="bg-navy-900 text-white text-[10px] font-medium text-center py-1.5 rounded">
                          Finalize Treatment Plan
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
          ].map((item, i) => (
            <div
              key={item.step}
              className="landing-step-item"
              style={{
                opacity: howVis.visible ? 1 : 0,
                transform: howVis.visible ? 'none' : 'translateY(20px)',
                transition: `opacity 0.5s ease-out ${i * 0.12}s, transform 0.5s ease-out ${i * 0.12}s`,
              }}
            >
              {/* Connector line (hidden on first, visible between steps on desktop) */}
              {i > 0 && <div className="landing-step-connector" />}
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                <item.icon className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step {item.step}</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              {/* Visual */}
              <div className="mt-4">{item.visual}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Cost Estimation Showcase ═══ */}
      <section id="why-curify" className="py-20 bg-slate-50 border-y border-slate-200 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — text */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-navy-900 tracking-tight">
                Cost transparency you can plan around
              </h2>
              <p className="mt-4 text-lg text-slate-500 leading-relaxed">
                See componentized cost breakdowns so you understand exactly where your money goes — before committing to a treatment plan.
              </p>

              {/* Financial planning mini-viz */}
              <div
                ref={costVis.ref}
                className="mt-8 space-y-3"
                style={{
                  opacity: costVis.visible ? 1 : 0,
                  transform: costVis.visible ? 'none' : 'translateY(12px)',
                  transition: 'opacity 0.5s ease-out 0.2s, transform 0.5s ease-out 0.2s',
                }}
              >
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Your budget</span>
                    <span className="font-semibold text-navy-900 tabular-nums">₹1,60,000</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Estimated treatment</span>
                    <span className="font-semibold text-navy-900 tabular-nums">₹1,28,000 – ₹1,54,000</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 font-medium">Remaining</span>
                    <span className="font-semibold text-emerald-700 tabular-nums">₹6,000 – ₹32,000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — cost breakdown mockup */}
            <div
              style={{
                opacity: costVis.visible ? 1 : 0,
                transform: costVis.visible ? 'none' : 'translateX(16px)',
                transition: 'opacity 0.6s ease-out 0.3s, transform 0.6s ease-out 0.3s',
              }}
            >
              <div className="landing-mockup-card">
                <div className="p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-navy-900 mb-1">Estimated Treatment Cost</h3>
                  <p className="text-2xl font-bold text-navy-900 tabular-nums">
                    ₹<AnimatedNumber value={128000} /> – ₹<AnimatedNumber value={154000} />
                  </p>

                  <div className="mt-5 space-y-2">
                    {[
                      { label: 'Procedure', min: '85,000', max: '1,02,000', pct: 66 },
                      { label: 'Doctor consultation', min: '8,000', max: '12,000', pct: 8 },
                      { label: 'Hospital stay (3–4 days)', min: '18,000', max: '22,000', pct: 14 },
                      { label: 'Diagnostics', min: '5,000', max: '6,000', pct: 4 },
                      { label: 'Medicines & supplies', min: '4,000', max: '5,000', pct: 3 },
                      { label: 'Contingency', min: '8,000', max: '7,000', pct: 5 },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3 text-xs">
                        <span className="w-36 text-slate-600 truncate">{row.label}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: costVis.visible ? `${row.pct}%` : '0%', transition: 'width 0.8s ease-out 0.5s' }}
                          />
                        </div>
                        <span className="text-slate-700 font-medium tabular-nums whitespace-nowrap">₹{row.min}</span>
                      </div>
                    ))}
                  </div>

                  {/* Confidence breakdown */}
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-white"><AnimatedNumber value={82} suffix="%" /></span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Recommendation confidence</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Input completeness', value: 92 },
                        { label: 'Query clarity', value: 84 },
                        { label: 'Benchmark match', value: 78 },
                      ].map((d) => (
                        <div key={d.label} className="flex items-center gap-3 text-xs">
                          <span className="w-32 text-slate-500">{d.label}</span>
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: costVis.visible ? `${d.value}%` : '0%', transition: 'width 0.8s ease-out 0.7s' }}
                            />
                          </div>
                          <span className="text-slate-700 font-medium tabular-nums">{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Benefits ═══ */}
      <section className="py-20 px-4">
        <div ref={benefitsVis.ref} className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-navy-900 tracking-tight">Built for everyone involved</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Patient card */}
            <div
              id="for-patients"
              className="landing-benefit-card scroll-mt-24"
              style={{
                opacity: benefitsVis.visible ? 1 : 0,
                transform: benefitsVis.visible ? 'none' : 'translateY(16px)',
                transition: 'opacity 0.5s ease-out 0.1s, transform 0.5s ease-out 0.1s',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">For Patients</h3>
              </div>
              <ul className="space-y-4 mb-6">
                {[
                  'Find relevant providers matched to your needs',
                  'Compare estimated costs across hospitals',
                  'Understand pricing components in detail',
                  'Plan healthcare financing with confidence',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              {/* Mini product preview */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-slate-500">Top recommendation</span>
                  <span className="text-teal-600 font-medium">94% match</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">Apollo Hospitals, Ahmedabad</p>
                <p className="text-xs text-slate-500 mt-0.5">₹1.28L – ₹1.54L · NABH Accredited</p>
              </div>
            </div>

            {/* Lender card */}
            <div
              id="for-lenders"
              className="landing-benefit-card scroll-mt-24"
              style={{
                opacity: benefitsVis.visible ? 1 : 0,
                transform: benefitsVis.visible ? 'none' : 'translateY(16px)',
                transition: 'opacity 0.5s ease-out 0.2s, transform 0.5s ease-out 0.2s',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-teal-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">For Lenders & Insurers</h3>
              </div>
              <ul className="space-y-4 mb-6">
                {[
                  'Structured treatment information for review',
                  'Component-level cost visibility',
                  'Confidence score for each case',
                  'Manual underwriting workflow',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              {/* Lender dashboard preview */}
              <div
                ref={lenderVis.ref}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                style={{
                  opacity: lenderVis.visible ? 1 : 0,
                  transition: 'opacity 0.5s ease-out 0.3s',
                }}
              >
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-medium text-slate-700">CUR-2026-008421</span>
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending Review</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mb-2.5">
                  <div><span className="text-slate-400">Treatment</span></div>
                  <div className="text-right"><span className="text-slate-700 font-medium">Knee Replacement</span></div>
                  <div><span className="text-slate-400">Hospital</span></div>
                  <div className="text-right"><span className="text-slate-700 font-medium">Apollo Hospitals</span></div>
                  <div><span className="text-slate-400">Estimate</span></div>
                  <div className="text-right"><span className="text-slate-700 font-medium tabular-nums">₹1.28L – ₹1.54L</span></div>
                  <div><span className="text-slate-400">Confidence</span></div>
                  <div className="text-right"><span className="text-emerald-600 font-medium">82%</span></div>
                </div>
                <div className="flex gap-1.5">
                  <span className="flex-1 text-center text-[10px] font-medium text-white bg-emerald-600 py-1 rounded">Approve</span>
                  <span className="flex-1 text-center text-[10px] font-medium text-slate-600 bg-white border border-slate-200 py-1 rounded">Review</span>
                  <span className="flex-1 text-center text-[10px] font-medium text-red-600 bg-white border border-slate-200 py-1 rounded">Reject</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Responsible AI ═══ */}
      <section id="responsible-ai" className="py-20 px-4 max-w-4xl mx-auto scroll-mt-20">
        <div
          ref={aiVis.ref}
          className="card p-8 sm:p-12 bg-slate-50 border-slate-200"
          style={{
            opacity: aiVis.visible ? 1 : 0,
            transform: aiVis.visible ? 'none' : 'translateY(16px)',
            transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-2xl font-semibold text-navy-900">Responsible AI</h2>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Curify AI provides financial and decision-support information. It does not provide
            medical diagnoses or treatment prescriptions. All clinical information is intended
            for preliminary planning and should be validated by qualified healthcare professionals.
          </p>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {[
              { icon: Shield, label: 'Decision support only' },
              { icon: BarChart3, label: 'Transparent confidence scoring' },
              { icon: Sparkles, label: 'No diagnostic claims' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                <item.icon className="w-4 h-4 text-teal-600 flex-shrink-0" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="py-20 bg-navy-900 text-white px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            Make your next healthcare decision with more clarity.
          </h2>
          <p className="mt-4 text-slate-400 text-lg">
            Discover hospitals, understand costs, and prepare financially — all in one place.
          </p>
          <button
            onClick={() => navigate(isAuthenticated && user ? `/${user.role}` : '/login?mode=signup')}
            className="mt-8 bg-teal-500 hover:bg-teal-400 text-white px-8 py-3.5 rounded-lg font-medium text-base transition-all duration-200 flex items-center gap-2 mx-auto cursor-pointer"
          >
            Explore your options
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="py-8 border-t border-slate-200 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer focus-visible:outline-none"
          >
            <Activity className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-semibold text-slate-700">Curify AI</span>
          </button>
          <p className="text-xs text-slate-500">
            © 2026 Curify AI. Healthcare decision-support platform. Not a medical diagnostic tool.
          </p>
        </div>
      </footer>
    </div>
  );
}
