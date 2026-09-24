const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocode(name, city) {
  const query = `${name}, ${city}, India`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Curify-Geocoding-Script/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: data[0].lat, lon: data[0].lon };
    }
    // Fallback just city
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', India')}&format=json&limit=1`;
    const fbRes = await fetch(fallbackUrl, { headers: { 'User-Agent': 'Curify-Geocoding-Script/1.0' } });
    const fbData = await fbRes.json();
    if (fbData && fbData.length > 0) {
      return { lat: fbData[0].lat, lon: fbData[0].lon };
    }
  } catch (err) {
    console.error(`Error geocoding ${name}:`, err);
  }
  return null;
}

async function main() {
  const sqlPath = path.resolve('data/datafor curify/hospitals_expanded.sql');
  let content = fs.readFileSync(sqlPath, 'utf8');
  
  const insertRegex = /INSERT INTO hospitals \(.*?\) VALUES \('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(NULL|-?\d+\.\d+),\s*(NULL|-?\d+\.\d+)/g;
  
  let matches = [];
  let match;
  while ((match = insertRegex.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      id: match[1],
      name: match[2],
      city: match[4],
      lat: match[7],
      lon: match[8]
    });
  }

  console.log(`Found ${matches.length} hospitals to geocode.`);
  
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (m.lat === 'NULL' || m.lon === 'NULL') {
      console.log(`[${i+1}/${matches.length}] Geocoding ${m.name}, ${m.city}...`);
      const coords = await geocode(m.name, m.city);
      if (coords) {
        console.log(`  -> Found: ${coords.lat}, ${coords.lon}`);
        const newMatch = m.fullMatch.replace(/,\s*NULL,\s*NULL/, `, ${coords.lat}, ${coords.lon}`);
        content = content.replace(m.fullMatch, newMatch);
      } else {
        console.log(`  -> Not found`);
      }
      await sleep(1200); // Respect Nominatim limits
    }
  }

  fs.writeFileSync(sqlPath, content);
  console.log('Done mapping hospitals!');
}

main().catch(console.error);
