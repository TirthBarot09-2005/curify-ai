export interface UnderwritingInput {
  monthlyIncome: number;
  monthlyBudget: number;
  requestedAmount: number;
  minCost: number;
  maxCost: number;
  hospitalRating: number;
  hospitalAccreditation: string;
  clinicalConfidence: number;
  profileCompletionPercentage: number;
}

export interface UnderwritingResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  recommendedAmount: number;
  breakdown: {
    dtiScore: number;
    budgetScore: number;
    clinicalScore: number;
    hospitalScore: number;
    completenessScore: number;
    varianceScore: number;
  };
}

export class UnderwritingService {
  /**
   * Deterministic 6-factor risk underwriting engine
   */
  static evaluate(input: UnderwritingInput): UnderwritingResult {
    const income = Math.max(10000, input.monthlyIncome || 60000);
    const requested = Math.max(10000, input.requestedAmount || 150000);
    const budget = Math.max(10000, input.monthlyBudget || 150000);

    // 1. Debt-to-Income Factor (30% weight)
    // Assumes an 18-month medical EMI ~ (requested / 18) + interest
    const estimatedMonthlyEmi = Math.round(requested / 16);
    const dtiRatio = estimatedMonthlyEmi / income;
    let dtiScore = 100;
    if (dtiRatio > 0.45) dtiScore = 40;
    else if (dtiRatio > 0.35) dtiScore = 60;
    else if (dtiRatio > 0.25) dtiScore = 80;
    else if (dtiRatio > 0.15) dtiScore = 95;

    // 2. Budget Alignment (20% weight)
    let budgetScore = 100;
    if (requested > budget * 1.5) budgetScore = 45;
    else if (requested > budget * 1.2) budgetScore = 70;
    else if (requested > budget) budgetScore = 85;
    else budgetScore = 98;

    // 3. Clinical Confidence (15% weight)
    const clinicalScore = Math.min(100, Math.round((input.clinicalConfidence || 0.85) * 100));

    // 4. Hospital Quality & Accreditation (15% weight)
    let hospitalScore = Math.round(((input.hospitalRating || 4.5) / 5) * 80);
    if ((input.hospitalAccreditation || '').includes('JCI')) hospitalScore += 20;
    else if ((input.hospitalAccreditation || '').includes('NABH')) hospitalScore += 15;
    hospitalScore = Math.min(100, hospitalScore);

    // 5. Information Completeness (10% weight)
    const completenessScore = Math.min(100, input.profileCompletionPercentage || 80);

    // 6. Cost Spread Variance (10% weight)
    const variance = (input.maxCost - input.minCost) / Math.max(1, input.minCost);
    let varianceScore = 100;
    if (variance > 0.4) varianceScore = 60;
    else if (variance > 0.25) varianceScore = 80;
    else varianceScore = 95;

    // Weighted composite risk score (0 to 100, where higher is safer / better creditworthiness)
    const compositeScore = Math.round(
      dtiScore * 0.30 +
      budgetScore * 0.20 +
      clinicalScore * 0.15 +
      hospitalScore * 0.15 +
      completenessScore * 0.10 +
      varianceScore * 0.10
    );

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' = 'LOW';
    if (compositeScore >= 75) riskLevel = 'LOW';
    else if (compositeScore >= 60) riskLevel = 'MODERATE';
    else if (compositeScore >= 45) riskLevel = 'HIGH';
    else riskLevel = 'VERY_HIGH';

    // Recommended loan amount
    let recommendedAmount = requested;
    if (riskLevel === 'HIGH') recommendedAmount = Math.round(requested * 0.8 / 1000) * 1000;
    else if (riskLevel === 'VERY_HIGH') recommendedAmount = Math.round(requested * 0.6 / 1000) * 1000;
    else if (compositeScore < 80) recommendedAmount = Math.min(requested, Math.round((input.minCost * 1.05) / 1000) * 1000);

    return {
      riskScore: compositeScore,
      riskLevel,
      recommendedAmount,
      breakdown: {
        dtiScore,
        budgetScore,
        clinicalScore,
        hospitalScore,
        completenessScore,
        varianceScore,
      },
    };
  }
}
