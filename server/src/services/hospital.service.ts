import { query } from '../config/database.js';
import { PricingEngine } from './pricing.service.js';

export interface HospitalFilters {
  city?: string;
  category?: string;
  procedure?: string;
  accreditation?: string;
  minRating?: number;
  maxCost?: number;
  maxDistance?: number;
  sort?: string;
}

export interface MatchFactor {
  name: string;
  weight: number;
  score: number;
}

export class HospitalService {
  /**
   * Approximate coordinates for Indian cities
   */
  static getCityCoordinates(city: string): { lat: number; lng: number } {
    const map: Record<string, { lat: number; lng: number }> = {
      ahmedabad: { lat: 23.0225, lng: 72.5714 },
      mumbai: { lat: 19.0760, lng: 72.8777 },
      delhi: { lat: 28.6139, lng: 77.2090 },
      'delhi ncr': { lat: 28.6139, lng: 77.2090 },
      'new delhi': { lat: 28.6139, lng: 77.2090 },
      bengaluru: { lat: 12.9716, lng: 77.5946 },
      bangalore: { lat: 12.9716, lng: 77.5946 },
      pune: { lat: 18.5204, lng: 73.8567 },
      hyderabad: { lat: 17.3850, lng: 78.4867 },
      chennai: { lat: 13.0827, lng: 80.2707 },
    };
    const key = (city || 'ahmedabad').toLowerCase().trim();
    return map[key] || map['ahmedabad'];
  }

  /**
   * Haversine distance in kilometers
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  static async getHospitals(filters: HospitalFilters = {}) {
    let sql = `SELECT * FROM hospitals WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (filters.city && filters.city !== 'All' && filters.city !== 'all') {
      const c = filters.city.toLowerCase();
      if (c.includes('delhi')) {
        sql += ` AND (LOWER(city) LIKE '%delhi%')`;
      } else if (c.includes('bengaluru') || c.includes('bangalore')) {
        sql += ` AND (LOWER(city) LIKE '%bengaluru%' OR LOWER(city) LIKE '%bangalore%')`;
      } else {
        sql += ` AND LOWER(city) LIKE $${idx++}`;
        params.push(`%${filters.city.toLowerCase()}%`);
      }
    }

    if (filters.accreditation && filters.accreditation !== 'All') {
      sql += ` AND accreditation LIKE $${idx++}`;
      params.push(`%${filters.accreditation}%`);
    }

    if (filters.minRating) {
      sql += ` AND rating >= $${idx++} AND rating IS NOT NULL`;
      params.push(Number(filters.minRating));
    }
    
    // Support new extended fields if provided in filters
    if ((filters as any).hospitalType && (filters as any).hospitalType !== 'All') {
      sql += ` AND hospital_type = $${idx++}`;
      params.push((filters as any).hospitalType);
    }
    
    if ((filters as any).minBeds) {
      sql += ` AND bed_count >= $${idx++}`;
      params.push(Number((filters as any).minBeds));
    }

    sql += ` ORDER BY rating DESC NULLS LAST`;

    const res = await query(sql, params);
    return res.rows;
  }

  static async getHospitalById(id: string) {
    const hospRes = await query(`SELECT * FROM hospitals WHERE id = $1`, [id]);
    if (hospRes.rowCount === 0) {
      const err: any = new Error('Hospital not found');
      err.statusCode = 404;
      throw err;
    }

    const procRes = await query(
      `SELECT * FROM hospital_procedures WHERE hospital_id = $1 ORDER BY min_cost ASC`,
      [id]
    );

    return {
      ...hospRes.rows[0],
      procedures: procRes.rows,
    };
  }

  /**
   * Deterministic matching algorithm for clinical mapping + patient profile
   */
  static async matchHospitals(
    mappingId: string,
    patientCity: string = 'Ahmedabad',
    patientBudget: number = 180000,
    targetProcedureParam?: string,
    categoryParam?: string
  ) {
    // 1. Get clinical mapping safely
    let mapping = null;
    try {
      const mapRes = await query(`SELECT * FROM clinical_mappings WHERE id = $1`, [mappingId]);
      mapping = mapRes.rows[0];
    } catch (err) {
      // If mappingId is not a valid UUID (e.g., 'fallback-id' from frontend), ignore and use defaults
    }

    const category = (categoryParam || mapping?.clinical_category || 'Orthopedics — Joint Reconstruction').toLowerCase();
    const targetProcedure = (targetProcedureParam || mapping?.target_procedure || 'Total Knee Replacement').toLowerCase();

    // 2. Fetch hospitals matching patient city if possible
    const normCity = (patientCity || 'Ahmedabad').toLowerCase();
    let cityCondition = '';
    if (normCity.includes('mumbai')) {
      cityCondition = `WHERE LOWER(city) LIKE '%mumbai%'`;
    } else if (normCity.includes('delhi') || normCity.includes('ncr')) {
      cityCondition = `WHERE LOWER(city) LIKE '%delhi%'`;
    } else if (normCity.includes('bengaluru') || normCity.includes('bangalore')) {
      cityCondition = `WHERE LOWER(city) LIKE '%bengaluru%' OR LOWER(city) LIKE '%bangalore%'`;
    } else if (normCity.includes('pune')) {
      cityCondition = `WHERE LOWER(city) LIKE '%pune%'`;
    } else {
      cityCondition = `WHERE LOWER(city) LIKE '%ahmedabad%'`;
    }

    let hospRows = await query(`SELECT * FROM hospitals ${cityCondition}`);
    if (hospRows.rowCount === 0) {
      hospRows = await query(`SELECT * FROM hospitals`);
    }

    const procRows = await query(`SELECT * FROM hospital_procedures`);
    const tagRows = await query(`SELECT * FROM hospital_service_tags`);
    const patientCoords = this.getCityCoordinates(patientCity);

    // Group procedures by hospital
    const procsByHosp: Record<string, any[]> = {};
    for (const p of procRows.rows) {
      if (!procsByHosp[p.hospital_id]) procsByHosp[p.hospital_id] = [];
      procsByHosp[p.hospital_id].push(p);
    }
    
    // Group tags by hospital
    const tagsByHosp: Record<string, string[]> = {};
    for (const t of tagRows.rows) {
      if (!tagsByHosp[t.hospital_id]) tagsByHosp[t.hospital_id] = [];
      tagsByHosp[t.hospital_id].push(t.tag);
    }

    const matchedHospitals = hospRows.rows.map((hosp: any) => {
      const hospProcs = procsByHosp[hosp.id] || [];

      // Procedure match
      // Tier 1: exact/near-exact procedure name match
      let bestProc = hospProcs.find(
        (p: any) => p.procedure_name.toLowerCase().includes(targetProcedure.slice(0, 12))
      );
      let matchTier: 'exact' | 'category' | 'none' = bestProc ? 'exact' : 'none';

      // Tier 2: same clinical category, different specific procedure
      if (!bestProc) {
        bestProc = hospProcs.find(
          (p: any) => p.clinical_category.toLowerCase().includes(category.slice(0, 10))
        );
        if (bestProc) matchTier = 'category';
      }

      // Tier 3: no relevant procedure at all — use hospital's cheapest listed
      // procedure as a rough baseline so cost comparison still has a number,
      // but score it honestly as a weak match
      if (!bestProc && hospProcs.length > 0) {
        bestProc = hospProcs.reduce((min: any, p: any) => ((p.min_cost !== null && p.min_cost < min.min_cost) ? p : min), hospProcs[0]);
        matchTier = 'none';
      }

      const procCompatibilityScore =
        matchTier === 'exact' ? 92
        : matchTier === 'category' ? 68
        : 45;

      // Distance calculation (Null-safe)
      let distanceScore = 80;
      let distance: number | null = null;
      if (hosp.latitude != null && hosp.longitude != null) {
        distance = this.calculateDistance(
          patientCoords.lat,
          patientCoords.lng,
          Number(hosp.latitude),
          Number(hosp.longitude)
        );
        distanceScore = Math.max(30, Math.min(100, Math.round(100 - (distance / 50) * 10)));
      }

      // Rating score (Null-safe)
      const ratingScore = hosp.rating != null ? Math.round((Number(hosp.rating) / 5) * 100) : 85;

      // Accreditation score (Null-safe)
      let accreditationScore = 80;
      if (hosp.accreditation) {
        if (hosp.accreditation.includes('JCI')) accreditationScore = 100;
        else if (hosp.accreditation.includes('NABH')) accreditationScore = 95;
      }

      // Differentiated procedural & facility-tiered pricing calculation
      const pricing = PricingEngine.calculatePricing({
        procedureName: bestProc?.procedure_name || targetProcedure,
        clinicalCategory: bestProc?.clinical_category || category,
        city: hosp.city || patientCity,
        hospital: {
          id: hosp.id,
          name: hosp.name,
          accreditation: hosp.accreditation,
          bed_count: hosp.bed_count,
          hospital_type: hosp.hospital_type,
        },
        baseMinOverride: bestProc?.min_cost,
        baseMaxOverride: bestProc?.max_cost,
      });

      const minCost = pricing.minCost;
      const maxCost = pricing.maxCost;
      const isEstimate = pricing.isEstimate;
      const avgCost = (minCost + maxCost) / 2;
      
      let affordabilityScore: number;
      if (avgCost <= patientBudget) {
        // Under budget: score rises from 75 (barely under) toward 100 (huge margin)
        const marginRatio = (patientBudget - avgCost) / patientBudget; // 0 to 1
        affordabilityScore = Math.min(100, Math.round(75 + marginRatio * 25));
      } else {
        // Over budget: score falls from just under 75 toward 40 as the overage grows
        const overageRatio = (avgCost - patientBudget) / patientBudget;
        affordabilityScore = Math.max(40, Math.round(75 - overageRatio * 60));
      }

      // Weighted Composite Score (0 - 100)
      // Procedure Compatibility (30%), Affordability (25%), Distance (15%), Rating (15%), Accreditation (15%)
      const matchScore = Math.min(
        99,
        Math.round(
          procCompatibilityScore * 0.3 +
          affordabilityScore * 0.25 +
          distanceScore * 0.15 +
          ratingScore * 0.15 +
          accreditationScore * 0.15
        )
      );

      const matchFactors: MatchFactor[] = [
        { name: 'Surgical Competence', weight: 30, score: procCompatibilityScore },
        { name: 'Affordability vs Benchmark', weight: 25, score: affordabilityScore },
        { name: 'Clinical Quality & Rating', weight: 15, score: ratingScore },
        { name: 'Accreditation & OT Safety', weight: 15, score: accreditationScore },
        { name: 'Proximity & Regional Accessibility', weight: 15, score: distanceScore },
      ];

      const costBreakdown = {
        components: pricing.components,
        totalMin: minCost,
        totalMax: maxCost,
        isEstimate,
      };

      return {
        id: hosp.id,
        name: hosp.name,
        address: hosp.address,
        city: hosp.city,
        state: hosp.state,
        latitude: hosp.latitude != null ? Number(hosp.latitude) : null,
        longitude: hosp.longitude != null ? Number(hosp.longitude) : null,
        accreditation: hosp.accreditation,
        rating: hosp.rating != null ? Number(hosp.rating) : null,
        bedCount: hosp.bed_count,
        established: hosp.year_established,
        phone: hosp.phone,
        website: hosp.website,
        hospital_type: hosp.hospital_type,
        rating_source: hosp.rating_source,
        accreditation_status: hosp.accreditation_status,
        source_url: hosp.source_url,
        data_status: hosp.data_status,
        service_tags: tagsByHosp[hosp.id] || [],
        specialties: (() => {
          if (!hosp.specialties) return [];
          if (Array.isArray(hosp.specialties)) return hosp.specialties;
          if (typeof hosp.specialties === 'string') {
            try {
              const parsed = JSON.parse(hosp.specialties);
              return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              return hosp.specialties.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }
          return [];
        })(),
        distance,
        matchScore,
        matchFactors,
        costBreakdown,
        confidence: {
          overall: 0.91,
          inputCompleteness: 0.94,
          queryClarity: 0.89,
          benchmarkMatch: 0.92,
        },
      };
    });

    // Sort descending by matchScore
    matchedHospitals.sort((a: any, b: any) => b.matchScore - a.matchScore);
    return matchedHospitals;
  }
}
