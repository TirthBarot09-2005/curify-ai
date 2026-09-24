# CURIFY AI integration notes — expanded hospitals

## Database fields
Add these columns to `hospitals`: `source_city`, `hospital_type`, `rating_source`, `accreditation_status`, `source_url`, `source_last_reviewed`, `source_license`, `data_status`, `coordinates_status`, `pricing_status`.

Create `hospital_service_tags(hospital_id, tag, source)` for fast service filtering.

## No fabricated values
Unknown values are intentionally NULL/blank: latitude, longitude, phone, email, establishment year, and some websites/accreditation values. Do not substitute guesses.

## Null-safe matching
Your current `HospitalService.matchHospitals()` assumes accreditation and coordinates exist. Make them nullable-safe. Treat missing values as `unknown`, not as `0` or a high score. For example:

```ts
const accreditation = String(hosp.accreditation ?? '');
const rating = hosp.rating == null ? null : Number(hosp.rating);
const distance = (hosp.latitude == null || hosp.longitude == null)
  ? null
  : this.calculateDistance(patientCoords.lat, patientCoords.lng, Number(hosp.latitude), Number(hosp.longitude));
```

## Ratings / accreditation
Public ratings are time-bound directory values. Keep source/date visible when shown. `NABH` means the source listed NABH; `not_provided_in_source` does not mean unaccredited.

## Procedure prices
The current service creates synthetic baseline costs when no hospital-specific procedure exists. Label those as benchmark estimates; only populate `hospital_procedures` from source-backed hospital tariffs.

## Useful features enabled
Hospital-type filters, specialty/service filters, hospital detail pages, source/provenance badges, bed-capacity comparison, rating sorting with source/date, NABH-listed filtering, city/neighborhood search, data-completeness badges, and procedure-price confidence states.
