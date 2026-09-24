import { randomUUID } from 'crypto';
import { query } from '../config/database.js';

export interface ClinicalAnalysisInput {
  patientId: string;
  query: string;
  age?: number;
  gender?: string;
  city?: string;
  comorbidities?: string[];
  budget?: number;
}

export interface ClinicalMappingResult {
  id: string;
  originalQuery: string;
  primaryConcern: string;
  clinicalCategory: string;
  icdCode: string;
  potentialPathway: string[];
  targetProcedure: string;
  confidence: {
    overall: number;
    inputCompleteness: number;
    queryClarity: number;
    benchmarkMatch: number;
  };
  source?: string;
}

export interface IClinicalAnalysisService {
  analyze(input: ClinicalAnalysisInput): Promise<ClinicalMappingResult>;
}

export function analyzeClinicalQueryFallback(input: ClinicalAnalysisInput) {
  const q = (input.query || '').toLowerCase();
  let primaryConcern = '';
  let clinicalCategory = '';
  let icdCode = '';
  let targetProcedure = '';
  let pathway: string[] = [];
  let confidenceScore = 0.91;

  const matchAny = (words: string[]) => words.some(w => q.includes(w));

  const orthoWords = ['knee', 'knee replacement', 'knee pain', 'knee surgery', 'acl', 'acl tear', 'ligament', 'ligament tear', 'meniscus', 'meniscus tear', 'cartilage', 'hip', 'hip replacement', 'hip pain', 'hip fracture', 'hip surgery', 'thr', 'tka', 'arthroplasty', 'joint', 'joints', 'joint pain', 'joint replacement', 'arthritis', 'osteoarthritis', 'rheumatoid', 'bone', 'bone fracture', 'fracture', 'broken bone', 'broken leg', 'broken arm', 'broken hip', 'spine', 'spinal', 'back pain', 'backache', 'slip disc', 'slipped disc', 'disc bulge', 'sciatica', 'spondylosis', 'spondylitis', 'shoulder', 'shoulder pain', 'rotator cuff', 'frozen shoulder', 'dislocation', 'dislocated shoulder', 'ortho', 'orthopedic', 'orthopaedic', 'orthopedics', 'osteoporosis', 'bone density', 'bone density loss', 'ligament reconstruction', 'tendon', 'tendon repair', 'tendinitis'];
  const cardioWords = ['cardio', 'cardiac', 'cardio surgery', 'cardio problem', 'heart', 'heart surgery', 'heart problem', 'heart attack', 'heart disease', 'heart failure', 'angio', 'angiogram', 'angiography', 'angioplasty', 'stent', 'stenting', 'bypass', 'cabg', 'open heart surgery', 'open heart', 'chest pain', 'chest tightness', 'chest discomfort', 'coronary', 'coronary artery', 'artery blockage', 'blocked artery', 'blocked arteries', 'ecg', 'ekg', 'echo', 'echocardiogram', 'tmt', 'stress test', 'valve', 'valve replacement', 'valve repair', 'mitral valve', 'aortic valve', 'arrhythmia', 'irregular heartbeat', 'palpitations', 'afib', 'atrial fibrillation', 'pacemaker', 'defibrillator', 'icd implant', 'bp', 'blood pressure', 'hypertension', 'high bp', 'cholesterol', 'high cholesterol', 'breathlessness', 'shortness of breath'];
  const gastroWords = ['gall', 'gallbladder', 'gallstone', 'gallstones', 'cholecyst', 'cholecystectomy', 'chole', 'bile', 'bile duct', 'stomach', 'stomach pain', 'stomach ache', 'abdominal pain', 'abdomen', 'belly pain', 'liver', 'liver disease', 'fatty liver', 'jaundice', 'cirrhosis', 'hepatitis', 'ulcer', 'stomach ulcer', 'peptic ulcer', 'acidity', 'acid reflux', 'gerd', 'heartburn', 'pancreas', 'pancreatitis', 'pancreatic', 'intestine', 'intestinal', 'bowel', 'ibs', 'ibd', 'colitis', "crohn's", 'endoscopy', 'colonoscopy', 'gastroscopy', 'piles', 'hemorrhoids', 'fissure', 'fistula', 'anal fistula', 'appendix', 'appendicitis', 'appendectomy', 'appendix removal', 'appendix pain', 'gastro', 'gastroenterology', 'digestive', 'digestion problem'];
  const ophthalmoWords = ['eye', 'eyes', 'eye surgery', 'eye problem', 'eye pain', 'eye checkup', 'cataract', 'cataract surgery', 'cataract operation', 'lens', 'lens implant', 'iol', 'intraocular lens', 'vision', 'vision loss', 'blurry vision', 'blurred vision', 'poor eyesight', 'eyesight', 'phaco', 'phacoemulsification', 'cornea', 'corneal', 'corneal transplant', 'lasik', 'refractive surgery', 'spectacle removal', 'glasses removal', 'glaucoma', 'eye pressure', 'retina', 'retinal', 'retinal detachment', 'diabetic retinopathy', 'squint', 'strabismus', 'ophthalmology', 'ophthalmologist', 'eye specialist'];
  const urologyWords = ['kidney', 'kidney stone', 'kidney stones', 'kidney pain', 'renal', 'renal stone', 'urology', 'urologist', 'urinary', 'urine', 'uti', 'urinary tract infection', 'bladder', 'bladder stone', 'bladder pain', 'stone', 'stones', 'calculus', 'lithotripsy', 'laser lithotripsy', 'rirs', 'pcnl', 'ureteroscopy', 'dj stent', 'prostate', 'prostate enlargement', 'bph', 'prostate surgery', 'turp', 'urethra', 'urethral', 'dialysis', 'kidney failure', 'kidney transplant', 'hydrocele', 'varicocele'];
  const generalSurgeryWords = ['hernia', 'inguinal hernia', 'umbilical hernia', 'hiatal hernia', 'hernia repair', 'hernia surgery', 'mesh', 'mesh repair', 'hernioplasty', 'laparoscopic hernia', 'lump', 'swelling', 'cyst', 'cyst removal', 'lipoma', 'lipoma removal', 'breast lump', 'breast surgery', 'mastectomy', 'thyroid', 'thyroid surgery', 'thyroidectomy', 'goiter', 'hydrocele repair', 'circumcision', 'general surgery', 'general surgeon', 'wound', 'wound care', 'abscess', 'abscess drainage'];

  if (matchAny(gastroWords) || (q.includes('laparoscopic') && q.includes('stone'))) {
    primaryConcern = 'Symptomatic cholelithiasis (gallstones) and gallbladder inflammation requiring laparoscopic surgical excision';
    clinicalCategory = 'Gastroenterology & Laparoscopic Surgery';
    icdCode = 'K80.20';
    targetProcedure = 'Laparoscopic Cholecystectomy (Gallbladder Removal)';
    pathway = [
      'Gastroenterologist & Laparoscopic Surgical Consultation',
      'High-Resolution Abdominal Ultrasound & Liver Function Panel (LFT)',
      'Laparoscopic Cholecystectomy (Four-Port Keyhole Resection)',
      'Post-Operative Recovery, Dietary Management & Rapid Discharge (1–2 days)',
    ];
  } else if (matchAny(ophthalmoWords)) {
    primaryConcern = 'Progressive crystalline lens opacification causing diminished visual acuity and glare sensitivity';
    clinicalCategory = 'Ophthalmology — Cataract & Refractive Surgery';
    icdCode = 'H25.9';
    targetProcedure = 'Cataract Surgery (Phacoemulsification with Premium IOL)';
    pathway = [
      'Comprehensive Slit-Lamp & Retinal Optical Assessment',
      'Optical Biometry & Premium Multifocal IOL Power Selection',
      'Micro-Incision Phacoemulsification with Foldable IOL Implantation',
      'Day-Care Post-Operative Vision Check & Anti-Inflammatory Regimen',
    ];
  } else if (matchAny(cardioWords)) {
    primaryConcern = 'Exertional chest discomfort and suspected coronary artery stenosis requiring angiography evaluation';
    clinicalCategory = 'Cardiology & Interventional Coronary Care';
    icdCode = 'I25.10';
    targetProcedure = 'Coronary Angiography (Cath Lab Diagnostic Evaluation)';
    pathway = [
      'Senior Interventional Cardiologist Clinical Assessment',
      'Non-Invasive Diagnostics (ECG, 2D-Echocardiography, Troponin-I, TMT)',
      'Transradial Coronary Angiography (Flat-Panel Cath Lab)',
      'Hemostasis Monitoring, Plaque Assessment & Stent Planning (1–2 days)',
    ];
  } else if (matchAny(generalSurgeryWords)) {
    primaryConcern = 'Abdominal wall / inguinal defect causing symptomatic hernia requiring tension-free mesh hernioplasty';
    clinicalCategory = 'General & Laparoscopic Surgery';
    icdCode = 'K40.90';
    targetProcedure = 'Laparoscopic Hernia Repair (Tension-Free Mesh Hernioplasty)';
    pathway = [
      'General & Laparoscopic Surgical Clinical Examination',
      'Abdominal Ultrasound & Pre-Op Coagulation Profile',
      'Laparoscopic TAPP/TEP Inguinal Hernioplasty with Lightweight 3D Mesh',
      'Post-Operative Observation & Early Ambulation (1 day)',
    ];
  } else if (matchAny(urologyWords)) {
    primaryConcern = 'Obstructive renal or ureteric calculus causing pain requiring laser lithotripsy fragmentation';
    clinicalCategory = 'Urology & Endoscopic Surgery';
    icdCode = 'N20.0';
    targetProcedure = 'Laser Lithotripsy (RIRS / PCNL for Renal Calculus)';
    pathway = [
      'Urology Specialist Review & Non-Contrast CT KUB Scan',
      'Renal Function Profile & Urine Culture Clearance',
      'Retrograde Intrarenal Surgery (RIRS) with Holmium Laser Lithotripsy',
      'Temporary DJ Stent Placement & Same-Day / Next-Day Discharge',
    ];
  } else if (matchAny(orthoWords)) {
    primaryConcern = 'Advanced degenerative osteoarthritis with joint space narrowing requiring total knee arthroplasty';
    clinicalCategory = 'Orthopedics — Joint Reconstruction';
    icdCode = 'M17.1';
    targetProcedure = 'Total Knee Replacement (Unilateral TKA)';
    pathway = [
      'Orthopedic Specialist Consultation & Alignment Radiography',
      'Pre-Anesthetic Medical Fitness & High-Flexion Implant Sizing',
      'Total Knee Arthroplasty (Unilateral TKA with Computer Navigation)',
      'Inpatient Physical Therapy & Accelerated Mobility Protocol (3–4 days)',
    ];
  } else {
    // Default: General Medicine
    primaryConcern = 'Non-specific symptoms or general health inquiry requiring clinical evaluation';
    clinicalCategory = 'General Medicine';
    icdCode = 'Z00.00';
    targetProcedure = 'General Medical Consultation';
    pathway = [
      'General Physician Consultation',
      'Basic Vitals & Physical Examination',
      'Diagnostic Blood Work (if indicated)',
      'Symptomatic Management & Specialist Referral (if required)',
    ];
    confidenceScore = 0.30;
  }

  return {
    primaryConcern,
    clinicalCategory,
    icdCode,
    targetProcedure,
    potentialPathway: pathway,
    confidence: {
      overall: confidenceScore,
      inputCompleteness: input.age && input.gender && input.city ? 0.94 : 0.82,
      queryClarity: confidenceScore > 0.5 ? 0.92 : 0.30,
      benchmarkMatch: confidenceScore > 0.5 ? 0.88 : 0.30,
    },
  };
}

export class RuleBasedClinicalAnalyzer implements IClinicalAnalysisService {
  async analyze(input: ClinicalAnalysisInput): Promise<ClinicalMappingResult> {
    const fallback = analyzeClinicalQueryFallback(input);
    const mappingId = randomUUID();

    // Save to database
    await query(
      `INSERT INTO clinical_mappings (id, patient_id, query, primary_concern, clinical_category, icd_code, target_procedure, potential_pathway, confidence, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10);`,
      [
        mappingId,
        input.patientId,
        input.query,
        fallback.primaryConcern,
        fallback.clinicalCategory,
        fallback.icdCode,
        fallback.targetProcedure,
        JSON.stringify(fallback.potentialPathway),
        fallback.confidence.overall,
        'fallback'
      ]
    );

    return {
      id: mappingId,
      originalQuery: input.query,
      primaryConcern: fallback.primaryConcern,
      clinicalCategory: fallback.clinicalCategory,
      icdCode: fallback.icdCode,
      potentialPathway: fallback.potentialPathway,
      targetProcedure: fallback.targetProcedure,
      confidence: fallback.confidence,
      source: 'fallback',
    };
  }
}

import { env } from '../config/env.js';
import { GeminiClinicalAnalyzer } from './gemini-clinical.service.js';

function createClinicalService(): IClinicalAnalysisService {
  if (env.GEMINI_API_KEYS && env.GEMINI_API_KEYS.length > 0) {
    console.log('[GEMINI] Clinical analyzer: Gemini-backed (fallback armed, key rotation enabled)');
    return new GeminiClinicalAnalyzer();
  }
  console.warn('[GEMINI] GEMINI_API_KEY not set — clinical analyzer running rule-based only');
  return new RuleBasedClinicalAnalyzer();
}
export const clinicalService = createClinicalService();
