import { describe, expect, it } from 'vitest';
import { calculateCost, decimal } from '../src/modules/costing/costing.calculator.js';

describe('Authoritative Costing Calculator & Financial Audit Suite', () => {
  const standardInput = {
    materialRate: '420',
    scrapRate: '3',
    overheadRate: '12',
    packingRate: '25',
    freightRate: '15',
    marginRate: '18',
    materialWeight: '4.25',
    annualVolume: 1200,
    operations: [
      { cycleTimeMinutes: '30', rateValue: '850' },
      { cycleTimeMinutes: '15', rateValue: '950' }
    ]
  };

  // Test 1: Normal material cost calculation
  it('1. Calculates normal material cost (weight * rate) accurately', () => {
    const result = calculateCost(standardInput);
    // 4.25 kg * 420 INR/kg = 1785.00 INR
    expect(result.components.material).toBe('1785');
  });

  // Test 2: Multiple manufacturing operations
  it('2. Sums multiple manufacturing operations correctly across different machine centers', () => {
    const result = calculateCost(standardInput);
    // Op1: 30 min @ 850/hr = (30 * 850) / 60 = 425 INR
    // Op2: 15 min @ 950/hr = (15 * 950) / 60 = 237.5 INR
    // Total Mfg = 425 + 237.5 = 662.5 INR
    expect(result.components.manufacturing).toBe('662.5');
  });

  // Test 3: Minute-to-hour conversion without premature truncation
  it('3. Converts cycle time minutes to hours without premature truncation error', () => {
    const singleOp = {
      ...standardInput,
      operations: [{ cycleTimeMinutes: '10', rateValue: '850' }]
    };
    const result = calculateCost(singleOp);
    // 10 min @ 850/hr: (10 * 850) / 60 = 8500 / 60 = 141.666666...
    // Previous premature truncation divide(10, 60) * 850 resulted in 141.6661
    expect(result.components.manufacturing).toBe('141.666666');
    expect(result.components.manufacturing).not.toBe('141.6661');
  });

  // Test 4: Overhead calculation on direct cost
  it('4. Calculates factory overhead percentage on direct cost (material + manufacturing)', () => {
    const result = calculateCost(standardInput);
    // Direct cost = 1785 (material) + 662.5 (manufacturing) = 2447.5 INR
    // Overhead = 12% of 2447.5 = 293.7 INR
    expect(result.components.overhead).toBe('293.7');
  });

  // Test 5: Positive scrap recovery deduction
  it('5. Strictly deducts scrap metal recovery as a credit reducing total cost', () => {
    const result = calculateCost(standardInput);
    // Material = 1785, Scrap = 3% of 1785 = 53.55
    // Mfg = 662.5, Overhead = 293.7, Packing = 25, Freight = 15
    // Correct Cost = 1785 - 53.55 + 662.5 + 293.7 + 25 + 15 = 2727.65
    // (If erroneously added: 1785 + 53.55 + ... = 2834.75)
    expect(result.components.scrap).toBe('53.55');
    expect(result.components.totalCost).toBe('2727.65');
    expect(result.components.totalCost).not.toBe('2834.75');
  });

  // Test 6: Zero scrap recovery
  it('6. Handles zero scrap recovery cleanly without affecting other components', () => {
    const zeroScrapInput = { ...standardInput, scrapRate: '0' };
    const result = calculateCost(zeroScrapInput);
    expect(result.components.scrap).toBe('0');
    // Cost = 1785 - 0 + 662.5 + 293.7 + 25 + 15 = 2781.2
    expect(result.components.totalCost).toBe('2781.2');
  });

  // Test 7: Scrap greater than allowed material cost throws error
  it('7. Throws error if scrap rate exceeds 100% or exceeds material cost', () => {
    expect(() => calculateCost({ ...standardInput, scrapRate: '105' }))
      .toThrow('Scrap rate percentage must be between 0% and 100%');
  });

  // Test 8: Freight and packaging per unit
  it('8. Adds fixed per-part packaging and freight allowances', () => {
    const result = calculateCost(standardInput);
    expect(result.components.packing).toBe('25');
    expect(result.components.freight).toBe('15');
  });

  // Test 9: Batch-level / annual scenario scaling
  it('9. Scales scenario volumes and total annual values accurately', () => {
    const result = calculateCost(standardInput);
    // Baseline annualVolume = 1200
    // Scenarios: 600 (0.5x), 1200 (1x), 2400 (2x)
    expect(result.scenarios).toHaveLength(3);
    const baseline = result.scenarios[1];
    expect(baseline.annualVolume).toBe('1200');
    // Unit Cost: 2727.65 -> Annual Cost: 2727.65 * 1200 = 3273180
    expect(baseline.annualCost).toBe('3273180');
  });

  // Test 10: Markup vs Gross margin distinction
  it('10. Distinguishes Gross Margin from Cost-Plus Markup and produces distinct selling prices', () => {
    const result = calculateCost(standardInput);
    const cost = 2727.65;
    // Cost-Plus Markup (18% markup on cost): 2727.65 * 1.18 = 3218.627
    const markupPrice = cost * 1.18;
    // Gross Margin (18% margin on selling price): 2727.65 / (1 - 0.18) = 2727.65 / 0.82 = 3326.402439
    const actualSellingPrice = Number(result.components.sellingPrice);
    expect(actualSellingPrice).toBeCloseTo(3326.402439, 4);
    expect(actualSellingPrice).not.toBeCloseTo(markupPrice, 2);
  });

  // Test 11: Gross margin calculation validation
  it('11. Validates that (Selling Price - Cost) / Selling Price strictly equals the margin rate', () => {
    const result = calculateCost(standardInput);
    const selling = Number(result.components.sellingPrice);
    const cost = Number(result.components.totalCost);
    const margin = Number(result.components.margin);
    expect(selling - cost).toBeCloseTo(margin, 5);
    const calculatedMarginRate = (margin / selling) * 100;
    expect(calculatedMarginRate).toBeCloseTo(18.0, 4);
  });

  // Test 12: Zero quantity handling
  it('12. Throws descriptive error for zero or missing annual volume', () => {
    expect(() => calculateCost({ ...standardInput, annualVolume: 0 }))
      .toThrow('Annual volume must be greater than zero');
  });

  // Test 13: Negative or invalid inputs
  it('13. Rejects negative or malformed numerical inputs defensively', () => {
    expect(() => calculateCost({ ...standardInput, materialWeight: '-5' }))
      .toThrow();
    expect(() => calculateCost({ ...standardInput, marginRate: '100' }))
      .toThrow('Margin must be between 0% and 99.9999%');
    expect(() => calculateCost({ ...standardInput, operations: [{ cycleTimeMinutes: '0', rateValue: '850' }] }))
      .toThrow('Cycle time must be greater than zero');
  });

  // Test 14: Rate Master format validation
  it('14. Correctly parses string rate master values without floating point drift', () => {
    const parsed = decimal.parse('850.550000');
    expect(decimal.format(parsed)).toBe('850.55');
  });

  // Test 15: Decimal precision and 6-digit fixed point scaling
  it('15. Preserves 6-decimal fixed-point precision throughout calculation chain', () => {
    const result = calculateCost(standardInput);
    expect(result.components.sellingPrice).toBe('3326.402439');
    expect(result.components.margin).toBe('598.752439');
  });

  // Test 16: Annual volume scenarios (0.5x, 1x, 2x)
  it('16. Validates contribution margin for half, baseline, and double annual volume scenarios', () => {
    const result = calculateCost(standardInput);
    const half = result.scenarios[0];
    const base = result.scenarios[1];
    const double = result.scenarios[2];

    expect(half.annualVolume).toBe('600');
    expect(base.annualVolume).toBe('1200');
    expect(double.annualVolume).toBe('2400');

    const halfContrib = Number(half.contribution);
    const baseContrib = Number(base.contribution);
    const doubleContrib = Number(double.contribution);

    expect(baseContrib).toBeCloseTo(halfContrib * 2, 2);
    expect(doubleContrib).toBeCloseTo(baseContrib * 2, 2);
  });

  // Test 17: Fixed rates snapshot integrity
  it('17. Guarantees deterministic calculation output when given identical frozen rate inputs', () => {
    const runA = calculateCost(standardInput);
    const runB = calculateCost(standardInput);
    expect(runA).toEqual(runB);
  });

  // Test 18: Approved quotation consistency with currency formatting
  it('18. Formats currency for GST and commercial quotation summaries consistently', () => {
    const taxable = decimal.parse('3185.041502');
    const tax = decimal.percent(taxable, '18');
    expect(decimal.formatCurrency(tax)).toBe('573.31');
    expect(decimal.formatCurrency(taxable + tax)).toBe('3758.35');
  });

  // Test 19: Authoritative total cost and selling price for frontend consumption
  it('19. Provides pre-calculated totalCost and sellingPrice so frontend performs no arithmetic', () => {
    const result = calculateCost(standardInput);
    expect(result.components).toHaveProperty('totalCost');
    expect(result.components).toHaveProperty('sellingPrice');
    expect(result.components).toHaveProperty('margin');
  });

  // Test 20: Regression test for the reported ₹2,142 discrepancy
  it('20. REGRESSION: Proves and eliminates the ₹2,142 cost discrepancy by subtracting scrap credit', () => {
    // Audit input reproducing the user-reported scenario:
    // Material = 35,700 (e.g., 85 kg @ 420)
    // Scrap = 3% of 35,700 = 1,071
    // Operation: 10 min @ 850/hr = (10 * 850) / 60 = 141.666666
    // Overhead = 12% of (35700 + 141.666666) = 4300.999999
    // Packing = 25, Freight = 15
    const regressionInput = {
      materialRate: '420',
      scrapRate: '3',
      overheadRate: '12',
      packingRate: '25',
      freightRate: '15',
      marginRate: '18',
      materialWeight: '85',
      annualVolume: 1000,
      operations: [{ cycleTimeMinutes: '10', rateValue: '850' }]
    };

    const result = calculateCost(regressionInput);

    expect(result.components.material).toBe('35700');
    expect(result.components.scrap).toBe('1071');
    expect(result.components.manufacturing).toBe('141.666666');
    expect(result.components.overhead).toBe('4300.999999');
    expect(result.components.packing).toBe('25');
    expect(result.components.freight).toBe('15');

    // Expected Correct Cost = 35,700 - 1,071 + 141.666666 + 4300.999999 + 25 + 15 = 39,111.666665
    expect(result.components.totalCost).toBe('39111.666665');

    // Erroneous buggy cost (if scrap was added):
    // 35,700 + 1,071 + 141.666666 + 4300.999999 + 25 + 15 = 41,253.666665
    const buggyCostIfAdded = 35700 + 1071 + 141.666666 + 4300.999999 + 25 + 15;
    const correctCost = Number(result.components.totalCost);

    // Discrepancy is exactly 2 * 1,071 = ₹2,142
    const discrepancy = buggyCostIfAdded - correctCost;
    expect(discrepancy).toBeCloseTo(2142.0, 5);
  });
});
