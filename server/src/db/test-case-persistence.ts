import { initializeDatabase, query } from '../config/database.js';
import { CaseService } from '../services/case.service.js';
import { TreatmentService } from '../services/treatment.service.js';

async function testPersistence() {
  console.log('--- TESTING CASE PERSISTENCE ---');
  await initializeDatabase();

  // Find the patient user
  const userRes = await query(`SELECT id, email, role FROM users WHERE role = 'patient' LIMIT 1`);
  if (!userRes.rows.length) {
    console.error('No patient user found!');
    process.exit(1);
  }
  const patient = userRes.rows[0];
  console.log(`[TEST] Using patient: ${patient.email} (${patient.id})`);

  // Create a treatment plan
  const plan = await TreatmentService.createPlan({
    patientId: patient.id,
    clinicalMappingId: 'local-mapping', // Test handling of non-UUID / placeholder mapping
    hospitalId: 'hosp-01-01',
    costBreakdown: {
      components: [
        { name: 'Surgery & OT Charges', minCost: 65000, maxCost: 75000 },
        { name: 'Hospital Stay (3-4 days)', minCost: 15000, maxCost: 18000 }
      ],
      totalMin: 145000,
      totalMax: 175000
    },
    status: 'FINALIZED'
  });
  console.log(`[TEST] Created treatment plan: ${plan.id}`);

  // Create a loan case
  const createdCase = await CaseService.createCase({
    patientId: patient.id,
    treatmentPlanId: plan.id,
    requestedAmount: 160000
  });
  console.log(`[TEST] Created loan case: ${(createdCase as any).case_number || (createdCase as any).caseNumber} (ID: ${createdCase.id})`);

  // Verify patient sees the case
  const patientCases = await CaseService.getCases({ patientId: patient.id });
  console.log(`[TEST] Patient query returned ${patientCases.length} cases.`);
  const foundForPatient = patientCases.some((c: any) => c.id === createdCase.id);
  console.log(`[TEST] Case found in patient list: ${foundForPatient}`);

  // Verify lender sees the case
  const lenderCases = await CaseService.getCases({});
  console.log(`[TEST] Lender query returned ${lenderCases.length} cases.`);
  const foundForLender = lenderCases.some((c: any) => c.id === createdCase.id);
  console.log(`[TEST] Case found in lender list: ${foundForLender}`);

  if (foundForPatient && foundForLender) {
    console.log('\n>>> SUCCESS: Case created and verified on both Patient and Lender sides! <<<');
  } else {
    console.error('\n>>> FAILURE: Case not found for patient or lender <<<');
    process.exit(1);
  }
}

testPersistence().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
