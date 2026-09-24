# CURIFY AI — Expanded Hospital Database v2

## Coverage
- 5 project cities only: Ahmedabad, Mumbai, Delhi NCR (Delhi entries), Bengaluru, Pune.
- 20 hospital records per project city = 100 hospitals total. Mumbai uses the Mumbai city page; Delhi NCR uses 20 Delhi entries for the initial release.
- Data is structured for the existing `hospitals` table plus a normalized service-tag extension.

## Provenance and no-fake-data rules
1. Hospital names, address, hospital type, bed count, specialties, public rating (where present), and NABH flag are sourced from the WIB public city datasets. The city pages state that they were last reviewed in **May 2026**; the underlying API is licensed CC-BY-4.0.
2. Official website URLs are included when the corresponding hospital page exposed one. Missing URLs are left blank rather than guessed.
3. Coordinates, phone numbers, email addresses, establishment years, and procedure tariffs are intentionally left NULL/blank unless source-backed in this release. **Do not replace these with guesses.**
4. `patient_rating` is a public directory rating and is time-bound; it is not a clinical-quality score. Keep the source/date visible in the UI if displayed.
5. `accreditation='NABH'` means the source listed the hospital as NABH. `accreditation_status='not_provided_in_source'` does not mean the hospital is unaccredited.
6. `service_tags` are mechanically derived from the published specialty strings and can be used for fast search/filtering.

## Government source to use for stronger verification
The Government of India's National Hospital Directory exposes a broader hospital dataset with contact/location, specialties, facilities, accreditation, establishment year, beds, and tariff-related fields. Use it as the primary verification source when filling the currently blank fields. Keep the original source URL and verification date in your database.

## Important integration note for your current backend
Your current `hospitals` schema requires latitude/longitude and gives defaults for rating/year/accreditation. This data pack deliberately makes latitude/longitude, rating, year_established and accreditation nullable so that missing real-world values remain unknown instead of becoming fake values.

Your current matching service also calculates distance from latitude/longitude. Until coordinates are populated from a verified geocoder/directory, either (a) filter out records with NULL coordinates for map/distance matching, or (b) add a fallback that returns `distance=null` and excludes the distance component from the score.

The current backend also creates a synthetic cost breakdown when a hospital lacks a matching procedure. Keep that behavior clearly labeled as a **benchmark estimate**; do not represent it as a hospital tariff. The included `procedure_pricing_import_template.csv` has no invented costs.

## Files
- `hospitals_expanded.json` — API/application-friendly master data.
- `hospitals_expanded.csv` — spreadsheet import.
- `curify_hospital_database_v2.xlsx` — formatted workbook with Hospitals, City Summary, Service Index, and Data Sources sheets.
- `hospitals_expanded.sql` — PostgreSQL migration + upsert script and service-tag table.
- `procedure_pricing_import_template.csv` — 7 procedure slots per hospital, all unverified/blank.
- `README_DATA_PROVENANCE.md` — this document.

## Recommended next enrichment pass
Use the Government of India directory + official hospital websites + NABH's accredited-organisation directory to fill: exact coordinates, phone, emergency number, ambulance, blood bank, email, establishment year, facilities, accreditation details, insurer/TPA/cashless networks, and published tariff ranges. Every populated field should retain `source_url` and `last_verified`.
