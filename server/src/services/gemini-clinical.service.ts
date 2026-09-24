import { randomUUID } from 'crypto';
import { z } from 'zod';
import { query } from '../config/database.js';
import { 
  ClinicalAnalysisInput, 
  ClinicalMappingResult, 
  IClinicalAnalysisService,
  analyzeClinicalQueryFallback
} from './clinical.service.js';
import { callGeminiJSON, recordCacheHit } from './gemini.service.js';
import { buildClinicalCacheKey } from '../utils/cacheKey.js';

const geminiResponseSchema = z.object({
  icd10_code: z.string().min(1),
  clinical_category: z.enum([
    'Orthopedics',
    'Gastroenterology',
    'Ophthalmology',
    'Cardiology',
    'General Surgery',
    'Urology',
    'General Medicine'
  ]),
  primary_concern: z.string().min(1),
  target_procedure: z.string().min(1),
  clinical_pathway: z.array(z.string()).min(3),
  confidence_score: z.number().int().min(0).max(100),
  reasoning: z.string()
});

export class GeminiClinicalAnalyzer implements IClinicalAnalysisService {
  async analyze(input: ClinicalAnalysisInput): Promise<ClinicalMappingResult> {
    try {
      // 1. Fetch missing profile data
      let { age, gender, city, comorbidities, budget } = input;
      let onboardingNotes = 'none';

      if (input.patientId) {
        const { rows } = await query(
          `SELECT age, date_of_birth, gender, city, preferred_city, existing_conditions, monthly_budget, additional_notes 
           FROM patient_profiles WHERE user_id = $1`,
          [input.patientId]
        );
        if (rows.length > 0) {
          const p = rows[0];
          if (age === undefined) {
            age = p.age;
            if (age === null && p.date_of_birth) {
              const dob = new Date(p.date_of_birth);
              const diffMs = Date.now() - dob.getTime();
              age = Math.abs(new Date(diffMs).getUTCFullYear() - 1970);
            }
          }
          if (gender === undefined) gender = p.gender;
          if (city === undefined) city = p.city || p.preferred_city;
          if (comorbidities === undefined && p.existing_conditions) {
            comorbidities = typeof p.existing_conditions === 'string' 
              ? JSON.parse(p.existing_conditions) 
              : p.existing_conditions;
          }
          if (budget === undefined) budget = p.monthly_budget;
          if (p.additional_notes) onboardingNotes = p.additional_notes;
        }
      }

      // 2. Cache lookup
      const cacheKey = buildClinicalCacheKey({
        query: input.query,
        age,
        gender,
        comorbidities
      });

      const { rows: cacheRows } = await query(
        `SELECT id, query, primary_concern, clinical_category, icd_code, target_procedure, potential_pathway, confidence, source, reasoning
         FROM clinical_mappings
         WHERE cache_key = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [cacheKey]
      );

      let resultData: any;
      let source = 'gemini';

      if (cacheRows.length > 0) {
        recordCacheHit();
        console.log('[GEMINI] cache hit — no API call');
        const cached = cacheRows[0];
        resultData = {
          primary_concern: cached.primary_concern,
          clinical_category: cached.clinical_category,
          icd10_code: cached.icd_code,
          target_procedure: cached.target_procedure,
          clinical_pathway: typeof cached.potential_pathway === 'string' ? JSON.parse(cached.potential_pathway) : cached.potential_pathway,
          confidence_score: Math.round(cached.confidence * 100),
          reasoning: cached.reasoning || ''
        };
        source = cached.source;
      } else {
        // 3. API Call
        const prompt = `You are a clinical triage assistant for a healthcare financing platform in India.
Analyze the following patient-described symptom/procedure query and return a structured JSON response.

Patient Query: "${input.query}"
Additional Context: Age: ${age || "not provided"}, Gender: ${gender || "not provided"}, Pre-existing Conditions: ${comorbidities ? comorbidities.join(', ') : "none provided"}, Additional Notes: ${onboardingNotes}, Treatment Budget: ₹${budget || "not specified"}

Category reference (use this to resolve ambiguous or colloquial terms):
- Orthopedics: knee, hip, joint, bone, fracture, spine, back pain, shoulder, ligament, ACL, arthritis
- Cardiology: heart, cardiac, cardio, angio, stent, bypass, CABG, chest pain, valve, arrhythmia, BP
- Gastroenterology: gallbladder, gallstone, stomach, liver, ulcer, appendix, piles, bowel, GERD
- Ophthalmology: eye, cataract, lens, vision, LASIK, cornea, retina, glaucoma
- Urology: kidney, bladder, urinary, prostate, stone, lithotripsy, UTI
- General Surgery: hernia, mesh, lump, cyst, thyroid, wound, abscess
- General Medicine: anything not clearly matching the above — use confidence_score ≤30 in this case

Return ONLY valid JSON in this exact structure, no markdown fences, no explanation, no preamble:

{
  "icd10_code": "string",
  "clinical_category": "one of: Orthopedics, Gastroenterology, Ophthalmology, Cardiology, General Surgery, Urology, General Medicine",
  "primary_concern": "string, one plain-language sentence",
  "target_procedure": "string",
  "clinical_pathway": ["string", "string", "string"],
  "confidence_score": 0-100 integer,
  "reasoning": "string, one short sentence"
}

Rules:
- If the query is vague or lacks medical specificity, set confidence_score below 50.
- Only return real, valid ICD-10 codes.
- clinical_category must be exactly one of the seven supported categories, or "General Medicine" if none fit (and confidence_score must then be <=30).
- Do not provide diagnosis, treatment recommendations, or medical advice — output is for cost/pathway estimation only.
- If patient context is insufficient to identify a specific procedure, say so plainly in primary_concern rather than guessing.`;

        const rawJson = await callGeminiJSON<any>(prompt, { temperature: 0.2 });
        
        // 4. Validate
        resultData = geminiResponseSchema.parse(rawJson);
      }

      // 5. Map & Persist
      const mappingId = randomUUID();
      const confidenceOverall = resultData.confidence_score / 100;
      const confidenceObj = {
        overall: confidenceOverall,
        inputCompleteness: (age && gender && city) ? 0.94 : 0.82,
        queryClarity: confidenceOverall,
        benchmarkMatch: 0.88,
      };

      await query(
        `INSERT INTO clinical_mappings
          (id, patient_id, query, primary_concern, clinical_category, icd_code,
           target_procedure, potential_pathway, confidence, source, cache_key, reasoning)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12);`,
        [
          mappingId,
          input.patientId,
          input.query,
          resultData.primary_concern,
          resultData.clinical_category,
          resultData.icd10_code,
          resultData.target_procedure,
          JSON.stringify(resultData.clinical_pathway),
          confidenceOverall,
          source,
          cacheKey,
          resultData.reasoning
        ]
      ).catch((e: any) => console.warn('[Clinical] Could not persist AI mapping:', e.message));

      return {
        id: mappingId,
        originalQuery: input.query,
        primaryConcern: resultData.primary_concern,
        clinicalCategory: resultData.clinical_category,
        icdCode: resultData.icd10_code,
        targetProcedure: resultData.target_procedure,
        potentialPathway: resultData.clinical_pathway,
        confidence: confidenceObj,
        source: source
      };
      
    } catch (err: any) {
      console.warn('[GEMINI] Falling back due to error:', err.message);
      // Fallback path
      const fallback = analyzeClinicalQueryFallback(input);
      const mappingId = randomUUID();
      
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
      ).catch((e: any) => console.warn('[Clinical] Could not persist fallback mapping:', e.message));
      
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
}
