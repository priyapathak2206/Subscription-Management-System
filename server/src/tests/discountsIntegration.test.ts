import { describe, it, expect } from 'vitest';
import { DiscountType, DiscountAppliesTo } from '@prisma/client';
import { getEligibleDiscounts, applyDiscount } from '../utils/discountEngine.js';

describe('Discount Auto-Application during Invoice Generation', () => {
  it('identifies and computes percentage discount on subscription line items', () => {
    const lines = [
      { productId: 'prod-saas-enterprise', quantity: 1, unitPrice: 500, amount: 500 },
    ];

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
      appliesTo: DiscountAppliesTo.SUBSCRIPTION,
    });

    expect(eligible).toHaveLength(1);

    const discountAmount = applyDiscount(eligible[0], lines);
    // 20% of 500 = 100
    expect(discountAmount).toBe(100);

    const subtotal = 500;
    const finalAmount = Math.max(0, subtotal - discountAmount);
    expect(finalAmount).toBe(400);
  });

  it('correctly caps fixed amount discount at total invoice subtotal', () => {
    const lines = [
      { productId: 'prod-starter', quantity: 1, unitPrice: 30, amount: 30 },
    ];

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

    const eligible = getEligibleDiscounts([discount], lines);
    expect(eligible).toHaveLength(1);

    const discountAmount = applyDiscount(eligible[0], lines);
    expect(discountAmount).toBe(30); // Capped at subtotal 30, cannot make total negative
  });
});

