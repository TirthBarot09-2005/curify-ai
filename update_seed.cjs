const fs = require('fs');
const path = require('path');

const p = path.resolve('server/src/db/seed.ts');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  "import { query, pool } from '../config/database.js';",
  "import fs from 'fs';\nimport path from 'path';\nimport { query, pool } from '../config/database.js';"
);

const startStr = '  // 5. Insert Hospitals (Ahmedabad, Mumbai, Delhi NCR, Bengaluru, Pune)';
const endStr = '  // 7. Insert Demo Clinical Mappings';

const sIdx = c.indexOf(startStr);
const eIdx = c.indexOf(endStr);

if (sIdx !== -1 && eIdx !== -1) {
  const replacement = `  // 5. Insert Hospitals from expanded SQL\n  console.log('[DB] Running hospitals_expanded.sql...');\n  const sqlPath = path.resolve(process.cwd(), '../data/datafor curify/hospitals_expanded.sql');\n  const sqlContent = fs.readFileSync(sqlPath, 'utf8');\n  await query(sqlContent);\n  console.log('[DB] Inserted expanded hospitals and service tags.');\n\n  // 6. Insert Hospital Procedures from CSV\n  console.log('[DB] Reading procedure_pricing_import_template.csv...');\n  const csvPath = path.resolve(process.cwd(), '../data/datafor curify/procedure_pricing_import_template.csv');\n  const csvContent = fs.readFileSync(csvPath, 'utf8');\n  const lines = csvContent.split('\\n');\n  let procCount = 0;\n  for (let i = 1; i < lines.length; i++) {\n    const line = lines[i].trim();\n    if (!line) continue;\n    const parts = line.split(',');\n    if (parts.length >= 5) {\n      const hospital_id = parts[0];\n      const name = parts[3];\n      const category = parts[4];\n      const min_cost = parts[5] ? parseInt(parts[5], 10) : null;\n      const max_cost = parts[6] ? parseInt(parts[6], 10) : null;\n      const duration = parts[7] || null;\n      await query(\n        \`INSERT INTO hospital_procedures (hospital_id, procedure_name, clinical_category, min_cost, max_cost, estimated_duration)\n         VALUES ($1, $2, $3, $4, $5, $6);\`, \n        [hospital_id, name, category, min_cost, max_cost, duration]\n      );\n      procCount++;\n    }\n  }\n  console.log(\`[DB] Inserted \${procCount} procedures from CSV.\`);\n\n`;
  c = c.slice(0, sIdx) + replacement + c.slice(eIdx);
  fs.writeFileSync(p, c);
  console.log('Successfully updated seed.ts');
} else {
  console.log('Could not find start/end indices');
}
