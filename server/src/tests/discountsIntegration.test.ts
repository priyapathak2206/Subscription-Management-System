import { describe, it, expect } from 'vitest';
import { DiscountType, DiscountAppliesTo } from '@prisma/client';
import { getEligibleDiscounts, applyDiscount } from '../utils/discountEngine.js';

describe('Discount Auto-Application during Invoice Generation', () => {
  it('identifies and computes percentage discount on subscription line items', () => {
    const lines = [
      { productId: 'prod-saas-enterprise', quantity: 1, unitPrice: 500, amount: 500 },
    ];
    const subtotal = 500;

    const discount = {
      id: 'disc-promo-20',
      name: 'Black Friday 20% Off',
      type: DiscountType.PERCENT,
      value: 20,
      minPurchase: 100,
      minQuantity: 1,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 1000,
      usedCount: 15,
      appliesTo: DiscountAppliesTo.SUBSCRIPTION,
      isActive: true,
    };

    const eligible = getEligibleDiscounts([discount], lines, {
      date: new Date('2026-06-15'),
      subtotal,
    });

    expect(eligible).toHaveLength(1);

    const result = applyDiscount(subtotal, eligible[0]);
    // 20% of 500 = 100
    expect(result.discountAmount).toBe(100);
    expect(result.finalAmount).toBe(400);
  });

  it('correctly caps fixed amount discount at total invoice subtotal', () => {
    const lines = [
      { productId: 'prod-starter', quantity: 1, unitPrice: 30, amount: 30 },
    ];
    const subtotal = 30;

    const discount = {
      id: 'disc-fixed-50',
      name: '50 Dollar Welcome Credit',
      type: DiscountType.FIXED,
      value: 50,
      minPurchase: 0,
      minQuantity: 1,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 100,
      usedCount: 0,
      appliesTo: DiscountAppliesTo.SUBSCRIPTION,
      isActive: true,
    };

    const eligible = getEligibleDiscounts([discount], lines, { subtotal });
    expect(eligible).toHaveLength(1);

    const result = applyDiscount(subtotal, eligible[0]);
    // Capped at subtotal 30, cannot make total negative
    expect(result.discountAmount).toBe(30);
    expect(result.finalAmount).toBe(0);
  });
});
