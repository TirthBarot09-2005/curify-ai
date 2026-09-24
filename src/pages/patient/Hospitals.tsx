import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Star,
  MapPin,
  Shield,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  GitCompare,
  ArrowRight,
  Check,
  Building2,
  Map as MapIcon,
  LayoutGrid,
  Columns,
  Loader2,
  Info,
} from 'lucide-react';
import { formatCostRange, formatINR } from '../../utils';
import { HospitalComparisonModal, Disclaimer, Toast } from '../../components/shared';
import HospitalMap from '../../components/HospitalMap';
import type { Hospital } from '../../types';

const sortOptions = [
  { value: 'match', label: 'Best Match Score' },
  { value: 'cost-asc', label: 'Lowest Estimated Cost' },
  { value: 'cost-desc', label: 'Highest Tier Facilities' },
  { value: 'distance', label: 'Closest Distance' },
  { value: 'rating', label: 'Highest Patient Rating' },
];

export default function PatientHospitals() {
  const navigate = useNavigate();
  const { hospitals, selectHospital, currentIntake, currentMapping, clinicalMappingId, matchHospitals } = useApp();
  const [sortBy, setSortBy] = useState('match');
  const [showFilters, setShowFilters] = useState(false);
  const [maxBudget, setMaxBudget] = useState(currentIntake?.budget ? currentIntake.budget.toString() : '');
  const [minRating, setMinRating] = useState('');
  const [selectedAccreditation, setSelectedAccreditation] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [minBeds, setMinBeds] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);
  const [compareList, setCompareList] = useState<Hospital[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);

  // View Mode: 'split' (side-by-side on desktop), 'cards' (list view), or 'map' (full map view)
  const [viewMode, setViewMode] = useState<'split' | 'cards' | 'map'>('split');
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | undefined>(undefined);

  // Fetch matched hospitals from backend API
  useEffect(() => {
    setHospitalsLoading(true);
    matchHospitals(
      clinicalMappingId || 'fallback-id',
      currentIntake?.location?.split(',')[0]?.trim() || 'Ahmedabad',
      currentIntake?.budget || 180000
    ).finally(() => setHospitalsLoading(false));
  }, [clinicalMappingId, currentIntake?.location, currentIntake?.budget]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = [...hospitals];
    if (maxBudget) list = list.filter((h) => h.costBreakdown.totalMin <= parseInt(maxBudget));
    if (minRating) list = list.filter((h) => (h.rating || 0) >= parseFloat(minRating));
    if (selectedAccreditation !== 'all') list = list.filter((h) => h.accreditation === selectedAccreditation);
    if (selectedType !== 'all') list = list.filter((h) => h.hospital_type === selectedType);
    if (minBeds) list = list.filter((h) => h.bedCount && h.bedCount >= parseInt(minBeds));
    if (selectedTag !== 'all') {
      list = list.filter((h) => {
        if (h.service_tags?.includes(selectedTag)) return true;
        if (h.specialties?.some(s => s.toLowerCase().includes(selectedTag.toLowerCase()))) return true;
        return false;
      });
    }

    switch (sortBy) {
      case 'cost-asc': list.sort((a, b) => a.costBreakdown.totalMin - b.costBreakdown.totalMin); break;
      case 'cost-desc': list.sort((a, b) => b.costBreakdown.totalMax - a.costBreakdown.totalMax); break;
      case 'distance': list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)); break;
      case 'rating': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      default: list.sort((a, b) => b.matchScore - a.matchScore);
    }
    return list;
  }, [hospitals, sortBy, maxBudget, minRating, selectedAccreditation, selectedType, minBeds, selectedTag]);

  const minCostInList = useMemo(() => {
    if (!filtered.length) return Infinity;
    return Math.min(...filtered.map((h) => h.costBreakdown?.totalMin || Infinity));
  }, [filtered]);

  const handleSelect = (hospital: Hospital) => {
    selectHospital(hospital);
    navigate(`/patient/hospitals/${hospital.id}`);
  };

  const openComparison = (hospital: Hospital) => {
    const otherHospital = filtered.find((h) => h.id !== hospital.id) || hospitals.find((h) => h.id !== hospital.id);
    const initial = otherHospital ? [hospital, otherHospital] : [hospital];
    setCompareList(initial);
    setShowCompareModal(true);
  };

  const handleCloseCompare = () => {
    setShowCompareModal(false);
    setCompareList([]);
  };

  const removeFromCompare = (hospitalId: string) => {
    setCompareList((prev) => prev.filter((h) => h.id !== hospitalId));
  };

  const addToCompare = (hospital: Hospital) => {
    if (compareList.length < 3 && !compareList.some((h) => h.id === hospital.id)) {
      setCompareList((prev) => [...prev, hospital]);
    }
  };

  const activeLocation = currentIntake?.location || 'Ahmedabad, Gujarat';

  return (
    <div className={`animate-fade-in mx-auto space-y-6 ${viewMode === 'split' ? 'max-w-7xl' : 'max-w-5xl'}`}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Stage Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">
          <span>Stage 3 of 5</span>
          <span>•</span>
          <span>Provider Discovery & Cost Comparison</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-navy-900 tracking-tight">
              Recommended Hospitals in {activeLocation}
            </h1>
            <p className="mt-1.5 text-slate-500 text-sm sm:text-base max-w-3xl">
              Multi-factor weighted match based on clinical category (<strong className="text-slate-800 font-semibold">{currentMapping?.clinicalCategory || 'Orthopedics'}</strong>), accreditation standards, local pricing tariffs, and patient satisfaction ratings.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'split'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Split View (Cards & Map side-by-side)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cards List View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Interactive Full Map"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar & Comparison Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900">
            {filtered.length} verified provider{filtered.length !== 1 ? 's' : ''} available
          </span>
          {currentIntake?.budget && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
              Budget Target: {formatINR(currentIntake.budget)}
            </span>
          )}
          {hospitalsLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              Matching facilities...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 ${showFilters ? 'bg-slate-100 border-slate-300' : ''}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            Filters
          </button>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort hospitals by"
              className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Expandable Filter Drawer */}
      {showFilters && (
        <div className="card p-5 bg-slate-50/80 border-slate-200/80 animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Refine Provider Results</span>
            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="budget-filter" className="block text-xs font-semibold text-slate-700 mb-1">Max Ceiling Budget (₹)</label>
              <input
                id="budget-filter"
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="e.g. 150000"
                className="input-field text-xs bg-white"
              />
            </div>

            <div>
              <label htmlFor="rating-filter" className="block text-xs font-semibold text-slate-700 mb-1">Minimum Patient Rating</label>
              <select
                id="rating-filter"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="input-field text-xs bg-white"
              >
                <option value="">Any Rating</option>
                <option value="4.7">4.7+ Exceptional</option>
                <option value="4.5">4.5+ Highly Rated</option>
                <option value="4.0">4.0+ Standard Good</option>
              </select>
            </div>

            <div>
              <label htmlFor="accreditation-filter" className="block text-xs font-semibold text-slate-700 mb-1">Accreditation Tier</label>
              <select
                id="accreditation-filter"
                value={selectedAccreditation}
                onChange={(e) => setSelectedAccreditation(e.target.value)}
                className="input-field text-xs bg-white"
              >
                <option value="all">All Accreditations</option>
                <option value="NABH">NABH Accredited</option>
                <option value="JCI">JCI Accredited</option>
                <option value="State Certified">State Certified</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="type-filter" className="block text-xs font-semibold text-slate-700 mb-1">Hospital Type</label>
              <select
                id="type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="input-field text-xs bg-white"
              >
                <option value="all">All Types</option>
                <option value="Private">Private</option>
                <option value="Trust">Trust</option>
                <option value="Government">Government</option>
              </select>
            </div>

            <div>
              <label htmlFor="beds-filter" className="block text-xs font-semibold text-slate-700 mb-1">Minimum Bed Count</label>
              <select
                id="beds-filter"
                value={minBeds}
                onChange={(e) => setMinBeds(e.target.value)}
                className="input-field text-xs bg-white"
              >
                <option value="">Any Size</option>
                <option value="100">100+ Beds</option>
                <option value="300">300+ Beds</option>
                <option value="500">500+ Beds</option>
                <option value="1000">1000+ Beds</option>
              </select>
            </div>

            <div>
              <label htmlFor="tag-filter" className="block text-xs font-semibold text-slate-700 mb-1">Service & Facility Tags</label>
              <select
                id="tag-filter"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="input-field text-xs bg-white"
              >
                <option value="all">Any Speciality</option>
                <option value="cardiac">Cardiac</option>
                <option value="orthopedics">Orthopedics</option>
                <option value="oncology">Oncology</option>
                <option value="neuro">Neurosciences</option>
                <option value="gastro">Gastroenterology</option>
                <option value="transplant">Organ Transplant</option>
                <option value="robotic">Robotic Surgery</option>
                <option value="women-child">Women & Child</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => { 
                setMaxBudget(''); 
                setMinRating(''); 
                setSelectedAccreditation('all'); 
                setSelectedType('all');
                setMinBeds('');
                setSelectedTag('all');
              }}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ MAIN CONTENT DISPLAY ═══════════ */}

      {/* 1. Full-width Map View */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <div className="h-[580px] w-full">
            <HospitalMap
              hospitals={filtered}
              selectedHospitalId={selectedHospitalId}
              hoveredHospitalId={hoveredHospitalId || undefined}
              onSelectHospital={handleSelect}
              onHoverHospital={(id) => setHoveredHospitalId(id)}
              userLocationName={activeLocation}
            />
          </div>

          {/* Horizontal scroll cards preview under full map */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Mapped Facilities ({filtered.length})
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((hospital) => {
                const isSelected = hospital.id === selectedHospitalId;
                return (
                  <div
                    key={hospital.id}
                    onMouseEnter={() => setHoveredHospitalId(hospital.id)}
                    onMouseLeave={() => setHoveredHospitalId(null)}
                    onClick={() => setSelectedHospitalId(hospital.id)}
                    className={`card p-4 transition-all duration-200 cursor-pointer ${
                      isSelected ? 'ring-2 ring-teal-500 shadow-md bg-teal-50/20' : 'hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{hospital.name}</h4>
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                        {hospital.matchScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {hospital.rating != null ? hospital.rating : 'N/A'}
                      </span>
                      <span>•</span>
                      <span>{hospital.distance != null ? `${hospital.distance} km` : 'N/A'}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{hospital.accreditation || 'Unaccredited'}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-2 flex flex-wrap items-center gap-1.5">
                      <span>{formatCostRange(hospital.costBreakdown.totalMin, hospital.costBreakdown.totalMax)}</span>
                      {hospital.costBreakdown.totalMin === minCostInList && filtered.length > 1 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                          Lowest Tariff
                        </span>
                      )}
                      {hospital.costBreakdown.isEstimate && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded border border-blue-200">
                          Est. Benchmark
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(hospital);
                      }}
                      className="btn-primary w-full text-xs py-1.5 mt-3 flex items-center justify-center gap-1"
                    >
                      Select Hospital
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Split View (Cards on Left, Sticky Map on Right) */}
      {viewMode === 'split' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Hospital Cards List */}
          <div className="lg:col-span-7 space-y-4">
            {filtered.map((hospital, idx) => {
              const isComparing = compareList.some((h) => h.id === hospital.id);
              const isExpanded = expandedWhy === hospital.id;
              const isHovered = hoveredHospitalId === hospital.id;
              const isSelected = selectedHospitalId === hospital.id;

              return (
                <div
                  key={hospital.id}
                  onMouseEnter={() => setHoveredHospitalId(hospital.id)}
                  onMouseLeave={() => setHoveredHospitalId(null)}
                  onClick={() => setSelectedHospitalId(hospital.id)}
                  className={`card p-5 transition-all duration-200 border-slate-200/80 hover:shadow-md cursor-pointer ${
                    isSelected || isHovered
                      ? 'ring-2 ring-teal-500 shadow-md bg-teal-50/10'
                      : idx === 0
                      ? 'ring-1 ring-teal-500/30'
                      : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Info & Badges */}
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-navy-900 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                          #{idx + 1}
                        </span>
                        <h3
                          className="text-base sm:text-lg font-bold text-navy-900 tracking-tight hover:text-teal-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(hospital);
                          }}
                        >
                          {hospital.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200/60">
                          <Shield className="w-3 h-3 text-emerald-600" />
                          {hospital.accreditation}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-500 text-white rounded-full">
                            Top Match
                          </span>
                        )}
                      </div>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {hospital.city} {hospital.distance != null ? `(${hospital.distance} km)` : ''}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {hospital.rating != null ? `${hospital.rating} / 5.0` : 'N/A'}
                        </span>
                        <span>{hospital.established ? `Est. ${hospital.established}` : ''}</span>
                      </div>

                      {/* Specialties Pills */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {hospital.specialties.slice(0, 3).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Match score bar & breakdown trigger */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedWhy(isExpanded ? null : hospital.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 group cursor-pointer"
                        >
                          <span>Match Score: <strong>{hospital.matchScore}%</strong></span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 animate-fade-in space-y-2">
                            {hospital.matchFactors.map((factor) => (
                              <div key={factor.name} className="space-y-0.5">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-700 font-medium">{factor.name}</span>
                                  <span className="font-bold text-slate-900 tabular-nums">{factor.score}%</span>
                                </div>
                                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-600 rounded-full" style={{ width: `${factor.score}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cost & Selection Actions */}
                    <div className="sm:text-right flex flex-col justify-between items-start sm:items-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Indicative Cost
                        </span>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-navy-900 tabular-nums tracking-tight">
                            {formatCostRange(hospital.costBreakdown.totalMin, hospital.costBreakdown.totalMax)}
                          </p>
                          {hospital.costBreakdown.totalMin === minCostInList && filtered.length > 1 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                              Lowest Tariff
                            </span>
                          )}
                          {hospital.costBreakdown.isEstimate && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded border border-blue-200" title="Based on regional benchmark averages">
                              Est. Benchmark
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold block">
                          {Math.round(hospital.confidence.overall * 100)}% Confidence
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openComparison(hospital);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Compare with other hospitals"
                        >
                          <GitCompare className="w-3.5 h-3.5 text-slate-500" />
                          <span>Compare</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(hospital);
                          }}
                          className="btn-primary text-xs py-1.5 px-3 font-semibold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          Select
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Sticky Interactive Leaflet Map */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="h-[620px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm">
              <HospitalMap
                hospitals={filtered}
                selectedHospitalId={selectedHospitalId}
                hoveredHospitalId={hoveredHospitalId || undefined}
                onSelectHospital={handleSelect}
                onHoverHospital={(id) => setHoveredHospitalId(id)}
                userLocationName={activeLocation}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Cards Only View */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {filtered.map((hospital, idx) => {
            const isComparing = compareList.some((h) => h.id === hospital.id);
            const isExpanded = expandedWhy === hospital.id;

            return (
              <div
                key={hospital.id}
                className={`card p-5 sm:p-6 transition-all duration-200 border-slate-200/80 hover:shadow-md ${
                  idx === 0 ? 'ring-1 ring-teal-500/30' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left: Info & Badges */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-navy-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <h3
                        className="text-lg sm:text-xl font-bold text-navy-900 tracking-tight hover:text-teal-700 cursor-pointer"
                        onClick={() => handleSelect(hospital)}
                      >
                        {hospital.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200/60">
                        <Shield className="w-3 h-3 text-emerald-600" />
                        {hospital.accreditation}
                      </span>
                      {idx === 0 && (
                        <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-teal-500 text-white rounded-full">
                          Best Match
                        </span>
                      )}
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {hospital.city}, {hospital.state} {hospital.distance != null ? `(${hospital.distance} km away)` : ''}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {hospital.rating != null ? `${hospital.rating} / 5.0` : 'N/A'}
                      </span>
                      <span>{hospital.established ? `Est. ${hospital.established}` : ''}</span>
                    </div>

                    {/* Specialties Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {hospital.specialties.map((s) => (
                        <span key={s} className="px-2 py-0.5 text-[11px] font-medium bg-slate-100/80 text-slate-600 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Match score bar & breakdown trigger */}
                    <div className="pt-2">
                      <button
                        onClick={() => setExpandedWhy(isExpanded ? null : hospital.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 group cursor-pointer"
                      >
                        <span>Why this match? (Score: {hospital.matchScore}%)</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 animate-fade-in space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider pb-1 border-b border-slate-200/60">
                            <span>Ranking Criterion</span>
                            <span>Weighted Score</span>
                          </div>
                          {hospital.matchFactors.map((factor) => (
                            <div key={factor.name} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-700 font-medium">{factor.name} <span className="text-slate-400 text-[10px]">({factor.weight}% weight)</span></span>
                                <span className="font-bold text-slate-900 tabular-nums">{factor.score}%</span>
                              </div>
                              <div className="h-1 bg-slate-200/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-teal-600 rounded-full"
                                  style={{ width: `${factor.score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Cost & Selection Actions */}
                  <div className="lg:text-right flex flex-col sm:flex-row lg:flex-col justify-between items-start sm:items-center lg:items-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex-shrink-0">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Indicative Cost Range
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xl sm:text-2xl font-bold text-navy-900 tabular-nums tracking-tight">
                          {formatCostRange(hospital.costBreakdown.totalMin, hospital.costBreakdown.totalMax)}
                        </p>
                        {hospital.costBreakdown.totalMin === minCostInList && filtered.length > 1 && (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                            Lowest Tariff
                          </span>
                        )}
                        {hospital.costBreakdown.isEstimate && (
                          <span className="px-2 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200" title="Based on regional benchmark averages">
                            Est. Benchmark
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                        {Math.round(hospital.confidence.overall * 100)}% High Confidence
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openComparison(hospital);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Compare with other hospitals"
                      >
                        <GitCompare className="w-3.5 h-3.5 text-slate-500" />
                        <span>Compare</span>
                      </button>

                      <button
                        onClick={() => handleSelect(hospital)}
                        className="btn-primary text-xs py-2 px-4 font-semibold flex items-center justify-center gap-1.5 flex-1 sm:flex-initial shadow-xs cursor-pointer"
                      >
                        View Estimate Breakdown
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="card p-12 text-center bg-white">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No matching hospitals found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your budget cap or clearing the accreditation filter to view all facilities in this region.
          </p>
          <button
            onClick={() => { 
              setMaxBudget(''); 
              setMinRating(''); 
              setSelectedAccreditation('all');
              setSelectedType('all');
              setMinBeds('');
              setSelectedTag('all');
            }}
            className="btn-secondary text-xs mt-4 cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      <HospitalComparisonModal
        open={showCompareModal}
        onClose={handleCloseCompare}
        hospitals={compareList}
        allHospitals={filtered}
        onSelectHospital={handleSelect}
        onAddHospital={addToCompare}
        onRemoveHospital={removeFromCompare}
      />

      <Disclaimer />
    </div>
  );
}
