import { describe, it, expect } from 'vitest';
import { calculateTax, calculateTotalWithTax } from '../utils/taxCalculator.js';

describe('Tax Calculator Utility', () => {
  it('computes standard tax percentage rounded to 2 decimal places', () => {
    const tax = calculateTax(100, { ratePercent: 18 });
    expect(tax).toBe(18.0);

    const fractionalTax = calculateTax(49.99, { ratePercent: 5.5 });
    // 49.99 * 0.055 = 2.74945 -> 2.75
    expect(fractionalTax).toBe(2.75);
  });

  it('returns 0 for inactive taxes', () => {
    const tax = calculateTax(250, { ratePercent: 18, active: false });
    expect(tax).toBe(0);
  });

  it('handles 0 or negative amounts gracefully', () => {
    expect(calculateTax(0, { ratePercent: 18 })).toBe(0);
    expect(calculateTax(-50, { ratePercent: 18 })).toBe(0);
  });

  it('calculates total with tax combined', () => {
    const res = calculateTotalWithTax(100, { ratePercent: 10 });
    expect(res.taxAmount).toBe(10);
    expect(res.totalWithTax).toBe(110);
  });
});

