import type { Hospital, ClinicalMapping, CostBreakdown } from '../types';

export const mockClinicalMappings: Record<string, ClinicalMapping> = {
  knee: {
    originalQuery: 'Total knee replacement surgery under ₹1.6L in Ahmedabad',
    primaryConcern: 'Advanced degenerative osteoarthritis with joint space narrowing requiring total knee arthroplasty',
    clinicalCategory: 'Orthopedics — Joint Reconstruction',
    icdCode: 'M17.1',
    potentialPathway: [
      'Orthopedic Specialist Consultation & Alignment Radiography',
      'Pre-Anesthetic Medical Fitness & High-Flexion Implant Sizing',
      'Total Knee Arthroplasty (Unilateral TKA with Computer Navigation)',
      'Inpatient Physical Therapy & Accelerated Mobility Protocol (3–4 days)',
    ],
    targetProcedure: 'Total Knee Replacement (Unilateral TKA)',
  },
  gallbladder: {
    originalQuery: 'Laparoscopic cholecystectomy with 2-day recovery stay',
    primaryConcern: 'Symptomatic cholelithiasis (gallstones) and gallbladder inflammation requiring laparoscopic surgical excision',
    clinicalCategory: 'Gastroenterology & Laparoscopic Surgery',
    icdCode: 'K80.20',
    potentialPathway: [
      'Gastroenterologist & Laparoscopic Surgical Consultation',
      'High-Resolution Abdominal Ultrasound & Liver Function Panel (LFT)',
      'Laparoscopic Cholecystectomy (Four-Port Keyhole Resection)',
      'Post-Operative Recovery, Dietary Management & Rapid Discharge (1–2 days)',
    ],
    targetProcedure: 'Laparoscopic Cholecystectomy (Gallbladder Removal)',
  },
  cataract: {
    originalQuery: 'Cataract surgery with premium multifocal lens implant',
    primaryConcern: 'Progressive crystalline lens opacification causing diminished visual acuity and glare sensitivity',
    clinicalCategory: 'Ophthalmology — Cataract & Refractive Surgery',
    icdCode: 'H25.9',
    potentialPathway: [
      'Comprehensive Slit-Lamp & Retinal Optical Assessment',
      'Optical Biometry & Premium Multifocal IOL Power Selection',
      'Micro-Incision Phacoemulsification with Foldable IOL Implantation',
      'Day-Care Post-Operative Vision Check & Anti-Inflammatory Regimen',
    ],
    targetProcedure: 'Cataract Surgery (Phacoemulsification with Premium IOL)',
  },
  cardiac: {
    originalQuery: 'Diagnostic cardiac angiography evaluation and stent pricing',
    primaryConcern: 'Exertional chest discomfort and suspected coronary artery stenosis requiring angiography evaluation',
    clinicalCategory: 'Cardiology & Interventional Coronary Care',
    icdCode: 'I25.10',
    potentialPathway: [
      'Senior Interventional Cardiologist Clinical Assessment',
      'Non-Invasive Diagnostics (ECG, 2D-Echocardiography, Troponin-I, TMT)',
      'Transradial Coronary Angiography (Flat-Panel Cath Lab)',
      'Hemostasis Monitoring, Plaque Assessment & Stent Planning (1–2 days)',
    ],
    targetProcedure: 'Coronary Angiography (Cath Lab Diagnostic Evaluation)',
  },
  hernia: {
    originalQuery: 'Laparoscopic hernia repair with mesh',
    primaryConcern: 'Abdominal wall / inguinal defect causing symptomatic hernia requiring tension-free mesh hernioplasty',
    clinicalCategory: 'General & Laparoscopic Surgery',
    icdCode: 'K40.90',
    potentialPathway: [
      'General & Laparoscopic Surgical Clinical Examination',
      'Abdominal Ultrasound & Pre-Op Coagulation Profile',
      'Laparoscopic TAPP/TEP Inguinal Hernioplasty with Lightweight 3D Mesh',
      'Post-Operative Observation & Early Ambulation (1 day)',
    ],
    targetProcedure: 'Laparoscopic Hernia Repair (Tension-Free Mesh Hernioplasty)',
  },
  kidneystone: {
    originalQuery: 'Laser kidney stone removal (RIRS lithotripsy)',
    primaryConcern: 'Obstructive renal or ureteric calculus causing pain requiring laser lithotripsy fragmentation',
    clinicalCategory: 'Urology & Endoscopic Surgery',
    icdCode: 'N20.0',
    potentialPathway: [
      'Urology Specialist Review & Non-Contrast CT KUB Scan',
      'Renal Function Profile & Urine Culture Clearance',
      'Retrograde Intrarenal Surgery (RIRS) with Holmium Laser Lithotripsy',
      'Temporary DJ Stent Placement & Same-Day / Next-Day Discharge',
    ],
    targetProcedure: 'Laser Lithotripsy (RIRS / PCNL for Renal Calculus)',
  },
  default: {
    originalQuery: 'Total knee replacement surgery under ₹1.6L in Ahmedabad',
    primaryConcern: 'Advanced degenerative joint deterioration requiring surgical reconstruction and tariff evaluation',
    clinicalCategory: 'Orthopedics — Joint Reconstruction',
    icdCode: 'M17.1',
    potentialPathway: [
      'Specialist Clinical Consultation & Radiographic Imaging',
      'Pre-Operative Assessment & Implant Selection',
      'Targeted Surgical Procedure & Clinical Pathway Protocol',
      'Post-Operative Recovery & Rehabilitation Planning',
    ],
    targetProcedure: 'Total Knee Replacement (Unilateral)',
  },
};

/**
 * Resolves user query into an accurate clinical mapping
 */
export function resolveClinicalMapping(query?: string): ClinicalMapping {
  const q = (query || '').toLowerCase().trim();

  if (!q) {
    return mockClinicalMappings.knee;
  }

  // Gallbladder / Cholecystectomy
  if (
    q.includes('gall') ||
    q.includes('chole') ||
    q.includes('bile') ||
    q.includes('stone in gall') ||
    q.includes('cholecyst')
  ) {
    return { ...mockClinicalMappings.gallbladder, originalQuery: query! };
  }

  // Cataract / Eye / Ophthalmology
  if (
    q.includes('cataract') ||
    q.includes('eye') ||
    q.includes('lens') ||
    q.includes('vision') ||
    q.includes('phaco') ||
    q.includes('cornea') ||
    q.includes('retina') ||
    q.includes('lasik') ||
    q.includes('glaucoma')
  ) {
    return { ...mockClinicalMappings.cataract, originalQuery: query! };
  }

  // Cardiac / Heart / Angiography / Stent / Chest Pain
  if (
    q.includes('cardiac') ||
    q.includes('heart') ||
    q.includes('angio') ||
    q.includes('stent') ||
    q.includes('chest pain') ||
    q.includes('coronary') ||
    q.includes('bypass') ||
    q.includes('cabg') ||
    q.includes('artery') ||
    q.includes('valve')
  ) {
    return { ...mockClinicalMappings.cardiac, originalQuery: query! };
  }

  // Hernia
  if (q.includes('hernia') || q.includes('inguinal') || q.includes('umbilical') || q.includes('mesh')) {
    return { ...mockClinicalMappings.hernia, originalQuery: query! };
  }

  // Kidney stone / Urology
  if (
    q.includes('kidney') ||
    q.includes('stone') ||
    q.includes('renal') ||
    q.includes('urolog') ||
    q.includes('lithotrip') ||
    q.includes('rirs') ||
    q.includes('pcnl') ||
    q.includes('ureter')
  ) {
    return { ...mockClinicalMappings.kidneystone, originalQuery: query! };
  }

  // Knee / Joint / Orthopedics / Hip
  if (
    q.includes('knee') ||
    q.includes('joint') ||
    q.includes('ortho') ||
    q.includes('arthroplasty') ||
    q.includes('hip') ||
    q.includes('bone') ||
    q.includes('spine') ||
    q.includes('ligament') ||
    q.includes('acl')
  ) {
    return { ...mockClinicalMappings.knee, originalQuery: query! };
  }

  // Smart dynamic extraction for other freeform queries
  const cleanTitle = query!.charAt(0).toUpperCase() + query!.slice(1);
  return {
    originalQuery: query!,
    primaryConcern: `Clinical evaluation and managed treatment pathway for ${query}`,
    clinicalCategory: 'General & Specialty Care',
    icdCode: 'Z01.89',
    potentialPathway: [
      'Specialist Clinical Evaluation & Assessment',
      'Diagnostic Imaging & Pre-Procedural Workup',
      `Targeted Intervention: ${cleanTitle}`,
      'Post-Operative Recovery & Follow-up Consultation',
    ],
    targetProcedure: cleanTitle,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Hospital Metadata per Target City
// ─────────────────────────────────────────────────────────────────────────────

interface BaseHospitalData {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  phone: string;
  website: string;
  rating: number;
  accreditation: string;
  bedCount: number;
  established: number;
  latitude: number;
  longitude: number;
  specialties: string[];
  distance: number;
  tierMultiplier: number; // multiplier against city baseline
  matchFactorsTemplate: { name: string; weight: number; score: number }[];
}

const MASTER_HOSPITALS: Record<string, BaseHospitalData[]> = {
  ahmedabad: [
    {
      id: 'hosp-001',
      name: 'Apollo Hospitals International',
      city: 'Ahmedabad',
      state: 'Gujarat',
      address: 'Plot No 1A, GIDC Estate, Bhat, Gandhinagar / Ahmedabad',
      pincode: '382428',
      phone: '+91 79 6670 1800',
      website: 'https://ahmedabad.apollohospitals.com',
      rating: 4.8,
      accreditation: 'NABH / JCI',
      bedCount: 350,
      established: 2003,
      latitude: 23.1093,
      longitude: 72.5850,
      distance: 5.8,
      tierMultiplier: 1.05,
      specialties: ['Orthopedics & Joint Replacement', 'Cardiology & CTVS', 'Gastroenterology', 'Advanced Laparoscopic Surgery'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 98 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 99 },
        { name: 'Clinical Reputation', weight: 15, score: 95 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 88 },
        { name: 'Proximity & Accessibility', weight: 10, score: 92 },
      ],
    },
    {
      id: 'hosp-003',
      name: 'Zydus Hospitals',
      city: 'Ahmedabad',
      state: 'Gujarat',
      address: 'Zydus Hospitals Road, SG Highway, Thaltej',
      pincode: '380054',
      phone: '+91 79 6619 0201',
      website: 'https://zydushospitals.com',
      rating: 4.7,
      accreditation: 'NABH',
      bedCount: 550,
      established: 2015,
      latitude: 23.0645,
      longitude: 72.5180,
      distance: 6.5,
      tierMultiplier: 1.02,
      specialties: ['Joint Reconstruction', 'Interventional Cardiology', 'Organ Transplant', 'Robotic Surgery', 'GI Surgery'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 95 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 96 },
        { name: 'Clinical Reputation', weight: 15, score: 94 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 90 },
        { name: 'Proximity & Accessibility', weight: 10, score: 90 },
      ],
    },
    {
      id: 'hosp-002',
      name: 'Sterling Hospitals',
      city: 'Ahmedabad',
      state: 'Gujarat',
      address: 'Sterling Hospital Road, Memnagar',
      pincode: '380052',
      phone: '+91 79 4001 1111',
      website: 'https://sterlinghospitals.com',
      rating: 4.6,
      accreditation: 'NABH',
      bedCount: 290,
      established: 2001,
      latitude: 23.0538,
      longitude: 72.5325,
      distance: 4.3,
      tierMultiplier: 0.95,
      specialties: ['Gastroenterology & Laparoscopy', 'Joint Replacement', 'Urology', 'Nephrology', 'Critical Care'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 90 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 92 },
        { name: 'Clinical Reputation', weight: 15, score: 89 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 95 },
        { name: 'Proximity & Accessibility', weight: 10, score: 95 },
      ],
    },
    {
      id: 'hosp-005',
      name: 'Marengo CIMS Hospital',
      city: 'Ahmedabad',
      state: 'Gujarat',
      address: 'Off Science City Road, Sola',
      pincode: '380060',
      phone: '+91 79 2771 2771',
      website: 'https://marengocims.com',
      rating: 4.7,
      accreditation: 'NABH / JCI',
      bedCount: 450,
      established: 2010,
      latitude: 23.0784,
      longitude: 72.5143,
      distance: 7.8,
      tierMultiplier: 1.00,
      specialties: ['Cardiology & Cardiac Surgery', 'Orthopedics', 'Vascular Surgery', 'Gastroenterology', 'Intensive Care'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 94 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 97 },
        { name: 'Clinical Reputation', weight: 15, score: 92 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 89 },
        { name: 'Proximity & Accessibility', weight: 10, score: 85 },
      ],
    },
    {
      id: 'hosp-004',
      name: 'KD Hospital (Kusum Dhirajlal)',
      city: 'Ahmedabad',
      state: 'Gujarat',
      address: 'Vaishno Devi Circle, SG Highway',
      pincode: '382421',
      phone: '+91 79 6777 0000',
      website: 'https://kdhospital.co.in',
      rating: 4.5,
      accreditation: 'NABH',
      bedCount: 300,
      established: 2018,
      latitude: 23.1256,
      longitude: 72.5412,
      distance: 11.2,
      tierMultiplier: 0.92,
      specialties: ['Orthopedics', 'Urology & Laser Lithotripsy', 'Cardiology', 'General Surgery', 'Pulmonology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 88 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 92 },
        { name: 'Clinical Reputation', weight: 15, score: 86 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 96 },
        { name: 'Proximity & Accessibility', weight: 10, score: 78 },
      ],
    },
  ],

  mumbai: [
    {
      id: 'hosp-007',
      name: 'Lilavati Hospital & Research Centre',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'A-791, Bandra Reclamation, Bandra West',
      pincode: '400050',
      phone: '+91 22 2675 1000',
      website: 'https://lilavatihospital.com',
      rating: 4.7,
      accreditation: 'NABH',
      bedCount: 323,
      established: 1997,
      latitude: 19.0515,
      longitude: 72.8290,
      distance: 5.2,
      tierMultiplier: 1.02,
      specialties: ['Orthopedics & Joint Replacement', 'Cardiology', 'GI Surgery & Laparoscopy', 'Neurosurgery', 'Urology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 97 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 96 },
        { name: 'Clinical Reputation', weight: 15, score: 96 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 88 },
        { name: 'Proximity & Accessibility', weight: 10, score: 94 },
      ],
    },
    {
      id: 'hosp-008',
      name: 'Kokilaben Dhirubhai Ambani Hospital',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'Rao Saheb Achutrao Patwardhan Marg, Four Bungalows, Andheri West',
      pincode: '400053',
      phone: '+91 22 4269 6969',
      website: 'https://kokilabenhospital.com',
      rating: 4.8,
      accreditation: 'NABH / JCI',
      bedCount: 750,
      established: 2009,
      latitude: 19.1314,
      longitude: 72.8252,
      distance: 8.5,
      tierMultiplier: 1.08,
      specialties: ['Robotic Orthopedics', 'Cardiovascular Sciences', 'Neurosciences', 'Surgical Oncology', 'Sports Medicine'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 98 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 99 },
        { name: 'Clinical Reputation', weight: 15, score: 98 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 84 },
        { name: 'Proximity & Accessibility', weight: 10, score: 88 },
      ],
    },
    {
      id: 'hosp-013',
      name: 'P. D. Hinduja National Hospital',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'Veer Savarkar Marg, Mahim West',
      pincode: '400016',
      phone: '+91 22 2445 1515',
      website: 'https://hindujahospital.com',
      rating: 4.8,
      accreditation: 'NABH',
      bedCount: 400,
      established: 1951,
      latitude: 19.0330,
      longitude: 72.8384,
      distance: 6.1,
      tierMultiplier: 1.00,
      specialties: ['Orthopedic Surgery', 'Cardiology & CTVS', 'General & Laparoscopic Surgery', 'Nephrology & Urology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 96 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 97 },
        { name: 'Clinical Reputation', weight: 15, score: 96 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 90 },
        { name: 'Proximity & Accessibility', weight: 10, score: 92 },
      ],
    },
    {
      id: 'hosp-014',
      name: 'Nanavati Max Super Speciality Hospital',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'SV Road, near Vile Parle West Flyover',
      pincode: '400056',
      phone: '+91 22 2626 7500',
      website: 'https://nanavatimaxhospital.org',
      rating: 4.6,
      accreditation: 'NABH',
      bedCount: 350,
      established: 1950,
      latitude: 19.0968,
      longitude: 72.8407,
      distance: 7.2,
      tierMultiplier: 0.96,
      specialties: ['Minimal Access Surgery', 'Joint Reconstruction', 'Interventional Cardiology', 'Gastroenterology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 92 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 94 },
        { name: 'Clinical Reputation', weight: 15, score: 91 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 93 },
        { name: 'Proximity & Accessibility', weight: 10, score: 90 },
      ],
    },
    {
      id: 'hosp-015',
      name: 'Sir H. N. Reliance Foundation Hospital',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'Raja Ram Mohan Roy Road, Prarthana Samaj, Girgaon',
      pincode: '400004',
      phone: '+91 22 6130 5000',
      website: 'https://rfhospital.org',
      rating: 4.9,
      accreditation: 'NABH / JCI',
      bedCount: 345,
      established: 2014,
      latitude: 18.9587,
      longitude: 72.8197,
      distance: 12.4,
      tierMultiplier: 1.10,
      specialties: ['Cardiac Sciences', 'Advanced Joint Arthroplasty', 'Gastrointestinal Sciences', 'Robotic Surgery'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 99 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 99 },
        { name: 'Clinical Reputation', weight: 15, score: 97 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 82 },
        { name: 'Proximity & Accessibility', weight: 10, score: 80 },
      ],
    },
  ],

  'delhi ncr': [
    {
      id: 'hosp-010',
      name: 'Indraprastha Apollo Hospitals',
      city: 'Delhi NCR',
      state: 'Delhi',
      address: 'Sarita Vihar, Delhi Mathura Road, New Delhi',
      pincode: '110076',
      phone: '+91 11 2692 5858',
      website: 'https://delhi.apollohospitals.com',
      rating: 4.8,
      accreditation: 'NABH / JCI',
      bedCount: 710,
      established: 1996,
      latitude: 28.5398,
      longitude: 77.2882,
      distance: 7.5,
      tierMultiplier: 1.04,
      specialties: ['Orthopedics & Joint Replacement', 'Cardiac Sciences', 'Gastroenterology', 'Renal Sciences', 'Robotic Surgery'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 97 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 98 },
        { name: 'Clinical Reputation', weight: 15, score: 96 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 88 },
        { name: 'Proximity & Accessibility', weight: 10, score: 90 },
      ],
    },
    {
      id: 'hosp-016',
      name: 'Max Super Speciality Hospital Saket',
      city: 'Delhi NCR',
      state: 'Delhi',
      address: '1, 2, Press Enclave Road, Mandir Marg, Saket, New Delhi',
      pincode: '110017',
      phone: '+91 11 2651 5050',
      website: 'https://maxhealthcare.in',
      rating: 4.8,
      accreditation: 'NABH / JCI',
      bedCount: 550,
      established: 2006,
      latitude: 28.5276,
      longitude: 77.2140,
      distance: 6.2,
      tierMultiplier: 1.02,
      specialties: ['Orthopedics & Joint Reconstruction', 'Minimal Access GI Surgery', 'Cardiology & CTVS', 'Urology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 96 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 97 },
        { name: 'Clinical Reputation', weight: 15, score: 95 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 89 },
        { name: 'Proximity & Accessibility', weight: 10, score: 92 },
      ],
    },
    {
      id: 'hosp-009',
      name: 'Fortis Escorts Heart Institute',
      city: 'Delhi NCR',
      state: 'Delhi',
      address: 'Okhla Road, Sukhdev Vihar Metro Station, New Delhi',
      pincode: '110025',
      phone: '+91 11 4713 5000',
      website: 'https://fortishealthcare.com',
      rating: 4.9,
      accreditation: 'NABH / JCI',
      bedCount: 310,
      established: 1988,
      latitude: 28.5603,
      longitude: 77.2798,
      distance: 8.1,
      tierMultiplier: 1.05,
      specialties: ['Interventional Cardiology', 'Cardiac Surgery', 'Vascular Interventions', 'General Surgery', 'Critical Care'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 99 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 99 },
        { name: 'Clinical Reputation', weight: 15, score: 98 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 87 },
        { name: 'Proximity & Accessibility', weight: 10, score: 88 },
      ],
    },
    {
      id: 'hosp-017',
      name: 'Medanta - The Medicity',
      city: 'Delhi NCR',
      state: 'Haryana',
      address: 'CH Bakhtawar Singh Road, Sector 38, Gurugram, Delhi NCR',
      pincode: '122001',
      phone: '+91 124 414 1414',
      website: 'https://medanta.org',
      rating: 4.8,
      accreditation: 'NABH / JCI',
      bedCount: 1250,
      established: 2009,
      latitude: 28.4394,
      longitude: 77.0427,
      distance: 18.5,
      tierMultiplier: 1.06,
      specialties: ['Orthopedic Institute', 'Heart Institute', 'Digestive and Hepatobiliary Sciences', 'Kidney & Urology Institute'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 98 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 99 },
        { name: 'Clinical Reputation', weight: 15, score: 97 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 86 },
        { name: 'Proximity & Accessibility', weight: 10, score: 76 },
      ],
    },
    {
      id: 'hosp-018',
      name: 'Sir Ganga Ram Hospital',
      city: 'Delhi NCR',
      state: 'Delhi',
      address: 'Sir Ganga Ram Hospital Marg, Rajinder Nagar, New Delhi',
      pincode: '110060',
      phone: '+91 11 2575 0000',
      website: 'https://sgrh.com',
      rating: 4.6,
      accreditation: 'NABH',
      bedCount: 675,
      established: 1954,
      latitude: 28.6385,
      longitude: 77.1895,
      distance: 9.8,
      tierMultiplier: 0.94,
      specialties: ['General & Minimal Access Surgery', 'Orthopedics', 'Gastroenterology', 'Cardiology', 'Nephrology & Urology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 93 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 94 },
        { name: 'Clinical Reputation', weight: 15, score: 94 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 94 },
        { name: 'Proximity & Accessibility', weight: 10, score: 85 },
      ],
    },
  ],

  bengaluru: [
    {
      id: 'hosp-011',
      name: 'Manipal Hospital HAL Airport Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: '98, HAL Old Airport Rd, Kodihalli',
      pincode: '560017',
      phone: '+91 80 2502 4444',
      website: 'https://manipalhospitals.com',
      rating: 4.7,
      accreditation: 'NABH / JCI',
      bedCount: 600,
      established: 1991,
      latitude: 12.9592,
      longitude: 77.6493,
      distance: 5.8,
      tierMultiplier: 1.04,
      specialties: ['Joint Replacement & Sports Injury', 'Cardiology & CTVS', 'GI Surgery & Laparoscopy', 'Organ Transplant'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 96 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 97 },
        { name: 'Clinical Reputation', weight: 15, score: 95 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 89 },
        { name: 'Proximity & Accessibility', weight: 10, score: 92 },
      ],
    },
    {
      id: 'hosp-019',
      name: 'Narayana Institute of Cardiac Sciences',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: '258/A, Bommasandra Industrial Area, Anekal Taluk',
      pincode: '560099',
      phone: '+91 80 7122 2222',
      website: 'https://narayanahealth.org',
      rating: 4.8,
      accreditation: 'NABH / JCI',
      bedCount: 600,
      established: 2000,
      latitude: 12.8028,
      longitude: 77.6961,
      distance: 14.5,
      tierMultiplier: 0.98,
      specialties: ['Cardiovascular Surgery', 'Interventional Cardiology', 'Electrophysiology', 'Vascular Interventions', 'General Surgery'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 98 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 98 },
        { name: 'Clinical Reputation', weight: 15, score: 97 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 95 },
        { name: 'Proximity & Accessibility', weight: 10, score: 80 },
      ],
    },
    {
      id: 'hosp-020',
      name: 'Aster CMI Hospital',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'No. 43/2, New Airport Road, NH 44, Sahakar Nagar, Hebbal',
      pincode: '560092',
      phone: '+91 80 4344 0400',
      website: 'https://asterhospitals.in',
      rating: 4.7,
      accreditation: 'NABH / JCI',
      bedCount: 500,
      established: 2014,
      latitude: 13.0573,
      longitude: 77.5925,
      distance: 11.2,
      tierMultiplier: 1.02,
      specialties: ['Orthopedics & Robotic Surgery', 'Cardiac Sciences', 'Gastroenterology', 'Urology & Nephrology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 95 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 97 },
        { name: 'Clinical Reputation', weight: 15, score: 93 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 90 },
        { name: 'Proximity & Accessibility', weight: 10, score: 86 },
      ],
    },
    {
      id: 'hosp-021',
      name: 'Fortis Hospital Bannerghatta Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: '154/9, Bannerghatta Road, Opposite IIM-B',
      pincode: '560076',
      phone: '+91 80 6621 4444',
      website: 'https://fortishealthcare.com',
      rating: 4.7,
      accreditation: 'NABH / JCI',
      bedCount: 400,
      established: 2006,
      latitude: 12.8936,
      longitude: 77.5976,
      distance: 8.9,
      tierMultiplier: 1.03,
      specialties: ['Orthopedic Arthroplasty', 'Cardiovascular Sciences', 'Minimal Access Surgery', 'Urology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 95 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 97 },
        { name: 'Clinical Reputation', weight: 15, score: 94 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 89 },
        { name: 'Proximity & Accessibility', weight: 10, score: 90 },
      ],
    },
    {
      id: 'hosp-022',
      name: 'Sakra World Hospital',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'SY No. 52/2 & 52/3, Devarabeesanahalli, Varthur Hobli, Outer Ring Road',
      pincode: '560103',
      phone: '+91 80 4969 4969',
      website: 'https://sakraworldhospital.com',
      rating: 4.6,
      accreditation: 'NABH',
      bedCount: 350,
      established: 2014,
      latitude: 12.9304,
      longitude: 77.6917,
      distance: 9.4,
      tierMultiplier: 0.97,
      specialties: ['Orthopedics & Joint Replacement', 'Neurosciences', 'Digestive Surgery', 'Cardiology & CTVS'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 92 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 94 },
        { name: 'Clinical Reputation', weight: 15, score: 91 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 93 },
        { name: 'Proximity & Accessibility', weight: 10, score: 88 },
      ],
    },
  ],

  pune: [
    {
      id: 'hosp-012',
      name: 'Ruby Hall Clinic',
      city: 'Pune',
      state: 'Maharashtra',
      address: '40, Sassoon Road, Sangamvadi',
      pincode: '411001',
      phone: '+91 20 6645 5100',
      website: 'https://rubyhall.com',
      rating: 4.6,
      accreditation: 'NABH',
      bedCount: 550,
      established: 1959,
      latitude: 18.5284,
      longitude: 73.8742,
      distance: 4.8,
      tierMultiplier: 1.02,
      specialties: ['Orthopedics', 'Cardiovascular Sciences', 'Oncology', 'Nephrology & Urology', 'Critical Care'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 95 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 95 },
        { name: 'Clinical Reputation', weight: 15, score: 94 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 91 },
        { name: 'Proximity & Accessibility', weight: 10, score: 93 },
      ],
    },
    {
      id: 'hosp-023',
      name: 'Jehangir Hospital',
      city: 'Pune',
      state: 'Maharashtra',
      address: '32, Sassoon Road, Opposite Pune Railway Station',
      pincode: '411001',
      phone: '+91 20 6681 1000',
      website: 'https://jehangirhospital.com',
      rating: 4.6,
      accreditation: 'NABH',
      bedCount: 350,
      established: 1946,
      latitude: 18.5298,
      longitude: 73.8756,
      distance: 5.1,
      tierMultiplier: 0.98,
      specialties: ['Orthopedics & Joint Replacement', 'Cardiology', 'Minimal Access Surgery', 'Gastroenterology'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 93 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 94 },
        { name: 'Clinical Reputation', weight: 15, score: 93 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 94 },
        { name: 'Proximity & Accessibility', weight: 10, score: 94 },
      ],
    },
    {
      id: 'hosp-024',
      name: 'Jupiter Hospital Baner',
      city: 'Pune',
      state: 'Maharashtra',
      address: 'Near Prathamesh Park, Baner-Balewadi Road, Baner',
      pincode: '411045',
      phone: '+91 20 2799 2222',
      website: 'https://jupiterhospital.com',
      rating: 4.7,
      accreditation: 'NABH',
      bedCount: 350,
      established: 2017,
      latitude: 18.5583,
      longitude: 73.7854,
      distance: 8.6,
      tierMultiplier: 1.04,
      specialties: ['Robotic Joint Replacement', 'Cardiac Care', 'GI & Hepatobiliary Surgery', 'Renal Sciences'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 96 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 96 },
        { name: 'Clinical Reputation', weight: 15, score: 92 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 89 },
        { name: 'Proximity & Accessibility', weight: 10, score: 87 },
      ],
    },
    {
      id: 'hosp-025',
      name: 'Sahyadri Super Speciality Hospital',
      city: 'Pune',
      state: 'Maharashtra',
      address: 'Plot No. 30 C, Erandwane, Karve Road, Deccan Gymkhana',
      pincode: '411004',
      phone: '+91 20 6721 5000',
      website: 'https://sahyadrihospital.com',
      rating: 4.5,
      accreditation: 'NABH',
      bedCount: 200,
      established: 1994,
      latitude: 18.5132,
      longitude: 73.8340,
      distance: 6.7,
      tierMultiplier: 0.95,
      specialties: ['General & Laparoscopic Surgery', 'Orthopedic Surgery', 'Neurosciences', 'Cardiology & Critical Care'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 90 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 92 },
        { name: 'Clinical Reputation', weight: 15, score: 89 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 96 },
        { name: 'Proximity & Accessibility', weight: 10, score: 90 },
      ],
    },
    {
      id: 'hosp-026',
      name: 'Manipal Hospital Pune (Kharadi)',
      city: 'Pune',
      state: 'Maharashtra',
      address: 'Survey No. 22/2A, Near Nyati Empire, Kharadi',
      pincode: '411014',
      phone: '+91 20 6165 6666',
      website: 'https://manipalhospitals.com',
      rating: 4.6,
      accreditation: 'NABH',
      bedCount: 150,
      established: 2014,
      latitude: 18.5529,
      longitude: 73.9348,
      distance: 10.3,
      tierMultiplier: 0.99,
      specialties: ['Orthopedics', 'Minimally Invasive Surgery', 'Cardiology', 'Urology', 'Internal Medicine'],
      matchFactorsTemplate: [
        { name: 'Surgical Competence', weight: 35, score: 91 },
        { name: 'Accreditation & OT Safety', weight: 25, score: 94 },
        { name: 'Clinical Reputation', weight: 15, score: 90 },
        { name: 'Affordability vs Benchmark', weight: 15, score: 93 },
        { name: 'Proximity & Accessibility', weight: 10, score: 85 },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// City Cost Multipliers (Reflecting real Indian healthcare economics)
// ─────────────────────────────────────────────────────────────────────────────
const CITY_COST_MULTIPLIERS: Record<string, number> = {
  ahmedabad: 1.00,
  mumbai: 1.25,
  'delhi ncr': 1.18,
  delhi: 1.18,
  bengaluru: 1.12,
  bangalore: 1.12,
  pune: 1.03,
};

// Helper: Normalize incoming city string to standard keys
function normalizeCityKey(locationStr?: string): 'ahmedabad' | 'mumbai' | 'delhi ncr' | 'bengaluru' | 'pune' {
  const s = (locationStr || '').toLowerCase();
  if (s.includes('mumbai') || s.includes('bombay')) return 'mumbai';
  if (s.includes('delhi') || s.includes('ncr') || s.includes('gurgaon') || s.includes('gurugram') || s.includes('noida')) return 'delhi ncr';
  if (s.includes('bengaluru') || s.includes('bangalore')) return 'bengaluru';
  if (s.includes('pune')) return 'pune';
  return 'ahmedabad';
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedural Cost Baseline Generators
// ─────────────────────────────────────────────────────────────────────────────

interface ProceduralBlueprint {
  matchScoreBase: number;
  components: { name: string; minPercent: number; maxPercent: number; baseMin: number; baseMax: number }[];
  overallMin: number;
  overallMax: number;
}

function getProcedureBlueprint(category: string, procedure: string, icd: string): ProceduralBlueprint {
  // 1. Gallbladder Removal (Laparoscopic Cholecystectomy)
  if (category.includes('gastro') || procedure.includes('cholecyst') || procedure.includes('gall') || icd === 'K80.20') {
    return {
      matchScoreBase: 94,
      overallMin: 58000,
      overallMax: 78000,
      components: [
        { name: 'Laparoscopic Procedure & OT Charges', minPercent: 0.52, maxPercent: 0.53, baseMin: 32000, baseMax: 42000 },
        { name: 'GI Surgeon & Anesthesia Consultation Fees', minPercent: 0.12, maxPercent: 0.13, baseMin: 7000, baseMax: 10000 },
        { name: 'Hospital Inpatient Stay (1–2 days Semi-Private)', minPercent: 0.11, maxPercent: 0.12, baseMin: 6500, baseMax: 9000 },
        { name: 'Pre & Post-Op Ultrasound & LFT Panel', minPercent: 0.07, maxPercent: 0.07, baseMin: 4000, baseMax: 5500 },
        { name: 'Consumables, Trocars, Clips & Medications', minPercent: 0.06, maxPercent: 0.06, baseMin: 3500, baseMax: 5000 },
        { name: 'Contingency & Recovery Reserve', minPercent: 0.12, maxPercent: 0.09, baseMin: 5000, baseMax: 6500 },
      ],
    };
  }

  // 2. Cataract Surgery (Phacoemulsification with IOL)
  if (category.includes('ophthalmology') || procedure.includes('cataract') || procedure.includes('phaco') || icd === 'H25.9') {
    return {
      matchScoreBase: 95,
      overallMin: 35000,
      overallMax: 52000,
      components: [
        { name: 'Phacoemulsification & Foldable IOL Lens', minPercent: 0.55, maxPercent: 0.57, baseMin: 20000, baseMax: 30000 },
        { name: 'Ophthalmic Surgeon & OT Sterility Fees', minPercent: 0.12, maxPercent: 0.13, baseMin: 4500, baseMax: 7000 },
        { name: 'Day-Care Recovery Bed & Nursing Care', minPercent: 0.08, maxPercent: 0.08, baseMin: 3000, baseMax: 4200 },
        { name: 'Optical Biometry (IOL Master) & Slit-Lamp Workup', minPercent: 0.08, maxPercent: 0.07, baseMin: 2800, baseMax: 3800 },
        { name: 'Viscoelastics & Antibiotic / Steroid Drops', minPercent: 0.06, maxPercent: 0.05, baseMin: 2200, baseMax: 3000 },
        { name: 'Follow-Up Vision Check & Contingency', minPercent: 0.11, maxPercent: 0.10, baseMin: 2500, baseMax: 4000 },
      ],
    };
  }

  // 3. Cardiac Angiography (Cath Lab Diagnostic)
  if (category.includes('cardio') || procedure.includes('angio') || procedure.includes('stent') || icd === 'I25.10') {
    return {
      matchScoreBase: 96,
      overallMin: 15000,
      overallMax: 23000,
      components: [
        { name: 'Digital Cath Lab Facility & Radiation Safety', minPercent: 0.44, maxPercent: 0.45, baseMin: 7000, baseMax: 10500 },
        { name: 'Senior Interventional Cardiologist Clinical Fee', minPercent: 0.19, maxPercent: 0.20, baseMin: 3000, baseMax: 4500 },
        { name: 'Radial Lounge / Day-Care Observation Bed (6-8 hrs)', minPercent: 0.13, maxPercent: 0.13, baseMin: 2000, baseMax: 3000 },
        { name: 'Contrast Media (Low Osmolar) & Radial Sheath Kit', minPercent: 0.10, maxPercent: 0.09, baseMin: 1500, baseMax: 2200 },
        { name: 'Pre-Procedure ECG, 2D-Echo & Coagulation Screening', minPercent: 0.07, maxPercent: 0.07, baseMin: 1000, baseMax: 1600 },
        { name: 'Plaque Assessment Report & Post-Cath Care', minPercent: 0.07, maxPercent: 0.06, baseMin: 500, baseMax: 1200 },
      ],
    };
  }

  // 4. Laparoscopic Hernia Repair
  if (category.includes('hernia') || procedure.includes('hernia') || icd === 'K40.90') {
    return {
      matchScoreBase: 93,
      overallMin: 50000,
      overallMax: 70000,
      components: [
        { name: 'Laparoscopic TEP/TAPP Surgical OT Charges', minPercent: 0.48, maxPercent: 0.48, baseMin: 24000, baseMax: 34000 },
        { name: 'Senior Surgeon & Anesthesia Team Fees', minPercent: 0.16, maxPercent: 0.16, baseMin: 8000, baseMax: 11000 },
        { name: 'Hospital Room Stay (1–2 days) & Nursing Care', minPercent: 0.12, maxPercent: 0.13, baseMin: 6000, baseMax: 9000 },
        { name: 'Lightweight 3D Anatomical Mesh & Tackers', minPercent: 0.10, maxPercent: 0.09, baseMin: 5000, baseMax: 6500 },
        { name: 'Pre-Op Ultrasound & Coagulation Profile', minPercent: 0.06, maxPercent: 0.06, baseMin: 3000, baseMax: 4500 },
        { name: 'Post-Operative Recovery Care & Medications', minPercent: 0.08, maxPercent: 0.08, baseMin: 4000, baseMax: 5000 },
      ],
    };
  }

  // 5. Laser Kidney Stone Removal (RIRS)
  if (category.includes('urol') || procedure.includes('stone') || procedure.includes('kidney') || procedure.includes('lithotrip') || icd === 'N20.0') {
    return {
      matchScoreBase: 94,
      overallMin: 58000,
      overallMax: 79000,
      components: [
        { name: 'RIRS Flexible Ureteroscopy & Holmium Laser Lithotripsy', minPercent: 0.48, maxPercent: 0.48, baseMin: 28000, baseMax: 38000 },
        { name: 'Senior Endourologist & OT Team Charges', minPercent: 0.16, maxPercent: 0.16, baseMin: 9000, baseMax: 13000 },
        { name: 'Hospital Stay (1 day) & Vitals Monitoring', minPercent: 0.11, maxPercent: 0.11, baseMin: 6500, baseMax: 9000 },
        { name: 'Ureteral Access Sheath, Nitinol Basket & DJ Stent', minPercent: 0.11, maxPercent: 0.11, baseMin: 6500, baseMax: 8500 },
        { name: 'Pre-Op NCCT KUB Scan & Urine Culture Panel', minPercent: 0.07, maxPercent: 0.07, baseMin: 4000, baseMax: 5500 },
        { name: 'Post-Operative Stent Removal & Contingency', minPercent: 0.07, maxPercent: 0.07, baseMin: 4000, baseMax: 5000 },
      ],
    };
  }

  // Default / Knee Replacement (Unilateral TKA)
  return {
    matchScoreBase: 95,
    overallMin: 135000,
    overallMax: 165000,
    components: [
      { name: 'High-Flexion CoCr Implant & Computer Navigation', minPercent: 0.45, maxPercent: 0.45, baseMin: 61000, baseMax: 74000 },
      { name: 'Robotic Arthroplasty OT & Surgical Facilities', minPercent: 0.22, maxPercent: 0.22, baseMin: 30000, baseMax: 36000 },
      { name: 'Senior Joint Arthroplasty Surgeon & Anesthesia Fees', minPercent: 0.11, maxPercent: 0.11, baseMin: 15000, baseMax: 18000 },
      { name: 'Inpatient Stay & Accelerated Physical Therapy (3–4 days)', minPercent: 0.10, maxPercent: 0.10, baseMin: 13500, baseMax: 16500 },
      { name: 'Pre-Op Scanogram, Digital X-Rays & Lab Clearance', minPercent: 0.05, maxPercent: 0.05, baseMin: 6500, baseMax: 8500 },
      { name: 'Mobilization Walking Frame, Medications & Reserve', minPercent: 0.07, maxPercent: 0.07, baseMin: 9000, baseMax: 12000 },
    ],
  };
}

/**
 * Returns procedural hospitals and cost breakdowns tailored strictly to the patient's selected city and clinical mapping.
 */
export function getHospitalsForMapping(mapping: ClinicalMapping | null, locationStr?: string): Hospital[] {
  const cityKey = normalizeCityKey(locationStr);
  const rawHospitals = MASTER_HOSPITALS[cityKey] || MASTER_HOSPITALS.ahmedabad;
  const cityMultiplier = CITY_COST_MULTIPLIERS[cityKey] || 1.0;

  const category = (mapping?.clinicalCategory || '').toLowerCase();
  const procedure = (mapping?.targetProcedure || '').toLowerCase();
  const icd = mapping?.icdCode || '';

  const blueprint = getProcedureBlueprint(category, procedure, icd);

  return rawHospitals.map((hosp, idx) => {
    // Combine city cost multiplier with individual hospital tier multiplier
    const totalMultiplier = cityMultiplier * hosp.tierMultiplier;

    // Scale components
    let runningMin = 0;
    let runningMax = 0;

    const components = blueprint.components.map((c) => {
      // round to nearest 500
      const minCost = Math.round((c.baseMin * totalMultiplier) / 500) * 500;
      const maxCost = Math.round((c.baseMax * totalMultiplier) / 500) * 500;
      runningMin += minCost;
      runningMax += maxCost;
      return {
        name: c.name,
        minCost,
        maxCost,
      };
    });

    const costBreakdown: CostBreakdown = {
      components,
      totalMin: runningMin,
      totalMax: runningMax,
    };

    // Hospital match score with small realistic variance per position
    const matchScore = Math.min(99, Math.max(82, blueprint.matchScoreBase + (2 - idx * 3)));

    const matchFactors = hosp.matchFactorsTemplate.map((mf) => ({
      name: mf.name,
      weight: mf.weight,
      score: Math.min(99, Math.max(70, mf.score - idx * 2)),
    }));

    return {
      id: hosp.id,
      name: hosp.name,
      city: hosp.city,
      state: hosp.state,
      accreditation: hosp.accreditation,
      rating: hosp.rating,
      distance: hosp.distance,
      matchScore,
      costBreakdown,
      confidence: {
        overall: Math.min(0.95, Math.max(0.78, 0.92 - idx * 0.03)),
        inputCompleteness: 0.94,
        queryClarity: 0.90,
        benchmarkMatch: Math.min(0.95, Math.max(0.75, 0.91 - idx * 0.04)),
      },
      matchFactors,
      specialties: hosp.specialties,
      bedCount: hosp.bedCount,
      established: hosp.established,
      latitude: hosp.latitude,
      longitude: hosp.longitude,
      address: hosp.address,
      phone: hosp.phone,
      website: hosp.website,
    };
  });
}

export const mockHospitals: Hospital[] = getHospitalsForMapping(null, 'Ahmedabad, Gujarat');
