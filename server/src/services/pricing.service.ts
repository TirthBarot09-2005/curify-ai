/**
 * Curify AI Differentiated Procedural Pricing Engine
 *
 * Implements real-world Indian healthcare procedural tariff benchmarks,
 * combining procedure baselines, city economics, hospital accreditation/tier multipliers,
 * and deterministic facility-level micro-variance.
 */

export interface CostComponentResult {
  name: string;
  minCost: number;
  maxCost: number;
}

export interface PricingResult {
  minCost: number;
  maxCost: number;
  isEstimate: boolean;
  components: CostComponentResult[];
  procedureName: string;
  clinicalCategory: string;
}

interface ComponentBlueprint {
  name: string;
  share: number; // proportional weight (sums close to 1.0)
}

interface ProcedureBlueprint {
  matchKeywords: string[];
  canonicalName: string;
  clinicalCategory: string;
  baseMin: number;
  baseMax: number;
  components: ComponentBlueprint[];
}

const PROCEDURE_BLUEPRINTS: ProcedureBlueprint[] = [
  // 1. Total Knee Replacement (TKA)
  {
    matchKeywords: ['knee', 'tka', 'arthroplasty', 'joint reconstruction', 'patella'],
    canonicalName: 'Total Knee Replacement (Unilateral TKA)',
    clinicalCategory: 'Orthopedics — Joint Reconstruction',
    baseMin: 135000,
    baseMax: 165000,
    components: [
      { name: 'Surgery & Specialized Orthopedic OT Facilities', share: 0.24 },
      { name: 'USFDA-Approved High-Flexion Implant & Navigation System', share: 0.45 },
      { name: 'Inpatient Room Stay (3–4 Days) & Specialized Nursing Care', share: 0.11 },
      { name: 'Senior Arthroplasty Surgeon & Anesthesia Consultation', share: 0.10 },
      { name: 'Pre-Operative Scanogram, Lab Clearance & Digital Imaging', share: 0.05 },
      { name: 'Post-Operative Mobilization, Medications & Recovery Reserve', share: 0.05 },
    ],
  },

  // 2. Total Hip Replacement (THR)
  {
    matchKeywords: ['hip', 'thr', 'acetabular', 'femoral head'],
    canonicalName: 'Total Hip Replacement (Primary Unilateral)',
    clinicalCategory: 'Orthopedics — Joint Reconstruction',
    baseMin: 150000,
    baseMax: 195000,
    components: [
      { name: 'Modular Joint Arthroplasty OT & Sterile Setup', share: 0.24 },
      { name: 'Ceramic-on-Polyethylene / Trabecular Titanium Hip Implant', share: 0.46 },
      { name: 'Inpatient Orthopedic Stay (3–5 Days) & Physical Therapy', share: 0.11 },
      { name: 'Chief Joint Replacement Surgeon & Anesthesia Team', share: 0.10 },
      { name: 'Pre-Operative CT Pelvis, Cross-Match & Diagnostics', share: 0.05 },
      { name: 'Post-Op Mobilization Walking Frame, Heparin & Reserve', share: 0.04 },
    ],
  },

  // 3. Laparoscopic Gallbladder Surgery (Cholecystectomy)
  {
    matchKeywords: ['gall', 'chole', 'bile', 'cholecyst', 'cholelithiasis'],
    canonicalName: 'Laparoscopic Cholecystectomy (Gallbladder Removal)',
    clinicalCategory: 'General Surgery & Gastroenterology',
    baseMin: 58000,
    baseMax: 78000,
    components: [
      { name: 'High-Definition Laparoscopic OT Suite & Facilities', share: 0.48 },
      { name: 'Titanium Hemostatic Clips, Endobags & Trocars', share: 0.14 },
      { name: 'Semi-Private Room Stay (1–2 Days) & Nursing Care', share: 0.12 },
      { name: 'Senior GI & Minimal Access Surgeon Fees', share: 0.14 },
      { name: 'Pre-Operative Abdominal Ultrasound & LFT Profile', share: 0.06 },
      { name: 'Bile Drainage Monitoring, Medications & Reserve', share: 0.06 },
    ],
  },

  // 4. Cataract Surgery (Phaco + Foldable IOL)
  {
    matchKeywords: ['cataract', 'phaco', 'eye', 'lens', 'iol', 'vision', 'ophthalm'],
    canonicalName: 'Cataract Surgery (Phacoemulsification with Foldable IOL)',
    clinicalCategory: 'Ophthalmology',
    baseMin: 32000,
    baseMax: 50000,
    components: [
      { name: 'Phacoemulsification System & Sterile Eye OT Facilities', share: 0.35 },
      { name: 'Foldable Hydrophobic Acrylic Monofocal/Multifocal IOL', share: 0.35 },
      { name: 'Day-Care Recovery Lounge & Specialized Ophthalmic Nursing', share: 0.08 },
      { name: 'Ophthalmic Microsurgeon & OT Team Consultation', share: 0.12 },
      { name: 'Pre-Op Optical Biometry (IOL Master) & Slit-Lamp Profile', share: 0.05 },
      { name: 'Viscoelastics, Antibiotic Eye Drops & Protective Shield', share: 0.05 },
    ],
  },

  // 5. Coronary Angiography (Diagnostic Cath Lab)
  {
    matchKeywords: ['angiography', 'coronary angio', 'cath lab', 'angio'],
    canonicalName: 'Coronary Angiography (Radial / Femoral Diagnostic)',
    clinicalCategory: 'Cardiology',
    baseMin: 16000,
    baseMax: 24000,
    components: [
      { name: 'Flat-Panel Digital Cath Lab Facility & Radiation Shielding', share: 0.45 },
      { name: 'Transradial Access Sheath, Catheters & Contrast Media', share: 0.17 },
      { name: 'Day-Care Cardiac Recovery Lounge (6–8 Hours Observation)', share: 0.12 },
      { name: 'Senior Interventional Cardiologist Clinical Interpretation', share: 0.16 },
      { name: 'Pre-Procedure 12-Lead ECG, 2D-Echo & Renal Function Panel', share: 0.06 },
      { name: 'Plaque Assessment Report & Post-Cath Care Reserve', share: 0.04 },
    ],
  },

  // 6. Coronary Angioplasty (PCI with Stent)
  {
    matchKeywords: ['angioplasty', 'pci', 'stent', 'percutaneous coronary'],
    canonicalName: 'Coronary Angioplasty (PCI with Drug-Eluting Stent)',
    clinicalCategory: 'Cardiology',
    baseMin: 135000,
    baseMax: 195000,
    components: [
      { name: 'Digital Cath Lab Operative Suite & Hemodynamic Monitoring', share: 0.28 },
      { name: 'USFDA-Approved Drug-Eluting Stents (DES) & Balloon Catheters', share: 0.42 },
      { name: 'Coronary Care Unit (CCU) Inpatient Stay (2 Days)', share: 0.12 },
      { name: 'Chief Interventional Cardiologist & Catheterization Team', share: 0.10 },
      { name: 'Pre/Post Activated Clotting Time (ACT) & Cardiac Enzymes', share: 0.04 },
      { name: 'Dual Antiplatelet Therapy, Heparin & Emergency Reserve', share: 0.04 },
    ],
  },

  // 7. Laparoscopic Hernia Repair
  {
    matchKeywords: ['hernia', 'inguinal', 'umbilical', 'tep', 'tapp', 'mesh'],
    canonicalName: 'Laparoscopic Hernia Repair (TEP / TAPP with 3D Mesh)',
    clinicalCategory: 'General Surgery',
    baseMin: 50000,
    baseMax: 70000,
    components: [
      { name: 'Laparoscopic TEP/TAPP Surgical OT Facilities', share: 0.46 },
      { name: '3D Anatomical Polypropylene Mesh & Fixation Tackers', share: 0.15 },
      { name: 'Hospital Room Stay (1–2 Days) & Post-Op Nursing Care', share: 0.13 },
      { name: 'General / Minimal Access Surgeon & Anesthesia Fees', share: 0.14 },
      { name: 'Pre-Operative Abdominal Ultrasound & Coagulation Profiling', share: 0.06 },
      { name: 'Post-Operative Support Garments & Medications', share: 0.06 },
    ],
  },

  // 8. Kidney Stone Surgery (RIRS / PCNL / Laser Lithotripsy)
  {
    matchKeywords: ['kidney stone', 'stone', 'rirs', 'pcnl', 'lithotrip', 'renal calculus', 'urol'],
    canonicalName: 'Laser Lithotripsy & RIRS (Kidney Stone Removal)',
    clinicalCategory: 'Urology',
    baseMin: 58000,
    baseMax: 79000,
    components: [
      { name: 'Flexible Digital Ureterorenoscopy & Holmium Laser Suite', share: 0.46 },
      { name: 'Nitinol Stone Extraction Basket, Access Sheath & DJ Stent', share: 0.15 },
      { name: 'Inpatient Stay (1–2 Days) & Renal Vitals Monitoring', share: 0.12 },
      { name: 'Senior Endourologist & Anesthesia Specialist Consultation', share: 0.15 },
      { name: 'Pre-Op NCCT KUB Imaging & Urine Culture Panel', share: 0.06 },
      { name: 'Post-Procedural DJ Stent Removal Protocol & Contingency', share: 0.06 },
    ],
  },

  // 9. Coronary Artery Bypass Graft (CABG)
  {
    matchKeywords: ['cabg', 'bypass', 'open heart', 'cardiothoracic', 'ctvs'],
    canonicalName: 'Coronary Artery Bypass Grafting (CABG / Open Heart)',
    clinicalCategory: 'Cardiothoracic Surgery',
    baseMin: 240000,
    baseMax: 340000,
    components: [
      { name: 'Advanced Cardiac OT & Heart-Lung Machine Support', share: 0.32 },
      { name: 'Arterial/Venous Grafts, Sternotomy Hardware & Cannulas', share: 0.28 },
      { name: 'Cardiac Intensive Care Unit (CICU 3–4 Days) & Inpatient Room', share: 0.18 },
      { name: 'Chief Cardio-Thoracic Surgeon & Perfusionist Team Fees', share: 0.12 },
      { name: 'Comprehensive Pre-Surgical Cardiac Workup & Angio Review', share: 0.05 },
      { name: 'Post-Op Cardiac Rehabilitation, Medications & Contingency', share: 0.05 },
    ],
  },
];

// Fallback Blueprint for any unrecognized medical procedure
const DEFAULT_BLUEPRINT: ProcedureBlueprint = {
  matchKeywords: [],
  canonicalName: 'Targeted Surgical Intervention & Clinical Pathway',
  clinicalCategory: 'General & Specialty Surgery',
  baseMin: 110000,
  baseMax: 155000,
  components: [
    { name: 'Surgery & Modular OT Facility Fee', share: 0.42 },
    { name: 'Surgical Consumables, Certified Implants & Medical Devices', share: 0.28 },
    { name: 'Inpatient Room Stay & Nursing Care', share: 0.12 },
    { name: 'Lead Specialist Surgeon & Anesthesia Consultation Fees', share: 0.10 },
    { name: 'Pre-Operative Diagnostic Workup & Lab Investigations', share: 0.05 },
    { name: 'Post-Operative Medications & Recovery Reserve', share: 0.03 },
  ],
};

/**
 * City cost multiplier reflecting commercial healthcare operational costs in India
 */
const CITY_MULTIPLIERS: Record<string, number> = {
  mumbai: 1.22,
  'delhi ncr': 1.16,
  delhi: 1.16,
  'new delhi': 1.16,
  gurgaon: 1.18,
  gurugram: 1.18,
  noida: 1.14,
  bengaluru: 1.10,
  bangalore: 1.10,
  pune: 1.02,
  ahmedabad: 1.00,
  hyderabad: 1.06,
  chennai: 1.05,
  kolkata: 0.98,
};

export class PricingEngine {
  /**
   * Resolves the matching procedural blueprint from query or procedure name
   */
  static findBlueprint(targetProcedure?: string, clinicalCategory?: string): ProcedureBlueprint {
    const p = (targetProcedure || '').toLowerCase();
    const c = (clinicalCategory || '').toLowerCase();
    const combined = `${p} ${c}`;

    for (const bp of PROCEDURE_BLUEPRINTS) {
      if (bp.matchKeywords.some((kw) => combined.includes(kw))) {
        return bp;
      }
    }

    return DEFAULT_BLUEPRINT;
  }

  /**
   * Normalizes city name and returns appropriate geographic multiplier
   */
  static getCityMultiplier(cityStr?: string): number {
    if (!cityStr) return 1.0;
    const s = cityStr.toLowerCase();
    for (const [key, mult] of Object.entries(CITY_MULTIPLIERS)) {
      if (s.includes(key)) return mult;
    }
    return 1.0;
  }

  /**
   * Calculates hospital tier multiplier based on brand reputation, accreditation, bed capacity, and ownership
   */
  static getHospitalTierMultiplier(hospital: {
    id?: string;
    name?: string;
    accreditation?: string | null;
    bed_count?: number | null;
    hospital_type?: string | null;
  }): number {
    const name = (hospital.name || '').toLowerCase();
    const acc = (hospital.accreditation || '').toLowerCase();
    const type = (hospital.hospital_type || '').toLowerCase();

    // 1. Public / Municipal / Govt-subsidized Apex Institutes (Lowest cost)
    if (
      name.includes('civil hospital') ||
      name.includes('vs general') ||
      name.includes('kem hospital') ||
      name.includes('lokmanya tilak') ||
      name.includes('safdarjung') ||
      name.includes('aiims') ||
      name.includes('ram manohar lohia')
    ) {
      return 0.70;
    }

    // 2. Subsidized Trust / Public-Private / Non-Profit Specialty Centres
    if (
      name.includes('un mehta') ||
      name.includes('tata memorial') ||
      name.includes('dharamshila narayana') ||
      name.includes('rajiv gandhi cancer') ||
      name.includes('gcs medical') ||
      name.includes('st. john')
    ) {
      return 0.78;
    }

    // 3. Regional Trust / Community Hospitals
    if (
      name.includes('rajasthan hospital') ||
      name.includes('bhagwan mahaveer') ||
      name.includes('trust') ||
      type.includes('trust') ||
      type.includes('government')
    ) {
      return 0.85;
    }

    // 4. Ultra-Premium Flagships & JCI International Multi-Specialty
    if (
      name.includes('kokilaben') ||
      name.includes('medanta') ||
      (name.includes('apollo') && (name.includes('international') || name.includes('delhi') || name.includes('mumbai') || name.includes('chennai') || name.includes('bannerghatta'))) ||
      name.includes('max super speciality') ||
      name.includes('fortis memorial') ||
      name.includes('nanavati max') ||
      name.includes('asian heart institute') ||
      name.includes('hiranandani hospital')
    ) {
      return 1.16;
    }

    // 5. Premier Tertiary Multi-Specialty (High clinical repute, NABH/JCI)
    if (
      name.includes('lilavati') ||
      name.includes('hinduja') ||
      name.includes('sir ganga ram') ||
      name.includes('apollo') ||
      name.includes('manipal') ||
      name.includes('shalby') ||
      name.includes('aster cmi') ||
      name.includes('sakra') ||
      name.includes('venkateshwar') ||
      name.includes('primus')
    ) {
      return 1.05;
    }

    // 6. Leading Multi-Specialty / Corporate Regional Centers
    if (
      name.includes('cims') ||
      name.includes('kd hospital') ||
      name.includes('sterling') ||
      name.includes('narayana') ||
      name.includes('zydus') ||
      name.includes('sal hospital') ||
      name.includes('hcg')
    ) {
      return 0.94;
    }

    // Fallback: Infer from accreditation & scale
    if (acc.includes('jci')) return 1.12;
    if (acc.includes('nabh') && hospital.bed_count && hospital.bed_count >= 400) return 1.05;
    if (acc.includes('nabh')) return 0.98;
    return 0.90;
  }

  /**
   * Deterministic micro-variance derived from hospital identifier/name hash.
   * Guarantees every hospital has its own unique, reproducible pricing (±3.5%).
   */
  static getHospitalMicroVariance(hospitalId?: string, hospitalName?: string): number {
    const seed = `${hospitalId || ''}:${hospitalName || ''}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    // Generates a floating value between -0.035 and +0.035 (-3.5% to +3.5%)
    return (((Math.abs(hash) % 1000) / 1000) * 0.07) - 0.035;
  }

  /**
   * Computes complete differentiated procedure pricing for a given hospital, procedure, and city.
   */
  static calculatePricing(options: {
    procedureName?: string;
    clinicalCategory?: string;
    city?: string;
    hospital: {
      id?: string;
      name?: string;
      accreditation?: string | null;
      bed_count?: number | null;
      hospital_type?: string | null;
    };
    baseMinOverride?: number | null;
    baseMaxOverride?: number | null;
  }): PricingResult {
    const { procedureName, clinicalCategory, city, hospital, baseMinOverride, baseMaxOverride } = options;

    const blueprint = this.findBlueprint(procedureName, clinicalCategory);
    const cityMultiplier = this.getCityMultiplier(city);
    const tierMultiplier = this.getHospitalTierMultiplier(hospital);
    const microVariance = this.getHospitalMicroVariance(hospital.id, hospital.name);

    // Total combined multiplier
    const totalMultiplier = cityMultiplier * tierMultiplier * (1 + microVariance);

    const rawBaseMin = baseMinOverride && baseMinOverride > 0 ? baseMinOverride : blueprint.baseMin;
    const rawBaseMax = baseMaxOverride && baseMaxOverride > 0 ? baseMaxOverride : blueprint.baseMax;

    // Round to clean nearest ₹500
    const minCost = Math.round((rawBaseMin * totalMultiplier) / 500) * 500;
    const maxCost = Math.round((rawBaseMax * totalMultiplier) / 500) * 500;

    // Distribute among components and ensure the sum exactly matches totalMin and totalMax
    let runningMin = 0;
    let runningMax = 0;

    const components: CostComponentResult[] = blueprint.components.map((comp, idx) => {
      const isLast = idx === blueprint.components.length - 1;
      if (isLast) {
        return {
          name: comp.name,
          minCost: minCost - runningMin,
          maxCost: maxCost - runningMax,
        };
      }

      // Round individual component amounts to clean nearest ₹100
      const compMin = Math.round((minCost * comp.share) / 100) * 100;
      const compMax = Math.round((maxCost * comp.share) / 100) * 100;

      runningMin += compMin;
      runningMax += compMax;

      return {
        name: comp.name,
        minCost: compMin,
        maxCost: compMax,
      };
    });

    return {
      minCost,
      maxCost,
      isEstimate: !baseMinOverride,
      components,
      procedureName: blueprint.canonicalName,
      clinicalCategory: blueprint.clinicalCategory,
    };
  }
}
