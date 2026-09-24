import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '../../data/curify.db');
const db = new Database(dbPath);

console.log('--- CURIFY SQLITE DB STATUS ---');
const tables = ['users', 'patient_profiles', 'lender_profiles', 'hospitals', 'hospital_procedures', 'clinical_mappings', 'treatment_plans', 'loan_cases', 'case_notes', 'audit_logs', 'case_events', 'loan_companies', 'loan_offers'];

for (const t of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM ${t}`).get() as any;
    console.log(`${t.padEnd(22)}: ${row.count} rows`);
  } catch (err: any) {
    console.log(`${t.padEnd(22)}: ERROR (${err.message})`);
  }
}

// Show any loan cases in the DB
try {
  const cases = db.prepare(`SELECT id, case_number, patient_id, requested_amount, status, created_at FROM loan_cases`).all();
  console.log('\n--- LOAN CASES ---');
  console.log(JSON.stringify(cases, null, 2));
} catch (err: any) {
  console.error('Error querying loan_cases:', err.message);
}

// Show users
try {
  const users = db.prepare(`SELECT id, clerk_user_id, email, role, first_name, last_name FROM users`).all();
  console.log('\n--- USERS ---');
  console.log(JSON.stringify(users, null, 2));
} catch (err: any) {
  console.error('Error querying users:', err.message);
}

db.close();
