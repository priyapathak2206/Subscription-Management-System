import { describe, it, expect } from 'vitest';
import { DiscountType, DiscountAppliesTo } from '@prisma/client';
import {
  getEligibleDiscounts,
  applyDiscount,
  DiscountItem,
  OrderLineItem,
} from '../utils/discountEngine.js';

describe('Discount Engine', () => {
  const baseLines: OrderLineItem[] = [
    { productId: 'prod-1', quantity: 2, unitPrice: 100, amount: 200 },
    { productId: 'prod-2', quantity: 1, unitPrice: 50, amount: 50 },
  ]; // Total = 250, totalQty = 3

  const validDiscount: DiscountItem = {
    id: 'disc-1',
    name: '10% Off Subscription',
    type: DiscountType.PERCENT,
    value: 10,
    minPurchase: 100,
    minQuantity: 2,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-12-31'),
    usageLimit: 50,
    usedCount: 5,
    appliesTo: DiscountAppliesTo.SUBSCRIPTION,
    isActive: true,
  };

  it('selects active and eligible discounts within date and usage limits', () => {
    const eligible = getEligibleDiscounts([validDiscount], baseLines, {
      date: new Date('2026-06-01'),
    });
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe('disc-1');
  });

  it('ignores inactive discounts', () => {
    const inactive = { ...validDiscount, isActive: false };
    const eligible = getEligibleDiscounts([inactive], baseLines);
    expect(eligible).toHaveLength(0);
  });

  it('ignores not-yet-started discounts', () => {
    const future = { ...validDiscount, startDate: new Date('2027-01-01') };
    const eligible = getEligibleDiscounts([future], baseLines, {
      date: new Date('2026-01-01'),
    });
    expect(eligible).toHaveLength(0);
  });

  it('ignores expired discounts', () => {
    const expired = { ...validDiscount, endDate: new Date('2025-12-31') };
    const eligible = getEligibleDiscounts([expired], baseLines, {
      date: new Date('2026-06-01'),
    });
    expect(eligible).toHaveLength(0);
  });

  it('ignores exhausted discounts where usedCount >= usageLimit', () => {
    const exhausted = { ...validDiscount, usageLimit: 10, usedCount: 10 };
    const eligible = getEligibleDiscounts([exhausted], baseLines);
    expect(eligible).toHaveLength(0);
  });

  it('ignores discounts when minimum purchase is not met', () => {
    const highMin = { ...validDiscount, minPurchase: 500 }; // base subtotal is 250
    const eligible = getEligibleDiscounts([highMin], baseLines);
    expect(eligible).toHaveLength(0);
  });

  it('ignores discounts when minimum quantity is not met', () => {
    const highQty = { ...validDiscount, minQuantity: 10 }; // base totalQty is 3
    const eligible = getEligibleDiscounts([highQty], baseLines);
    expect(eligible).toHaveLength(0);
  });

  it('validates product-targeted discounts against line items', () => {
    const productDiscount: DiscountItem = {
      ...validDiscount,
      id: 'disc-prod',
      appliesTo: DiscountAppliesTo.PRODUCT,
      discountProducts: [{ productId: 'prod-1' }],
    };

    const eligible = getEligibleDiscounts([productDiscount], baseLines);
    expect(eligible).toHaveLength(1);

    const nonMatchingProductDiscount: DiscountItem = {
      ...validDiscount,
      id: 'disc-unmatched',
      appliesTo: DiscountAppliesTo.PRODUCT,
      discountProducts: [{ productId: 'prod-999' }],
    };

    const unmatchEligible = getEligibleDiscounts([nonMatchingProductDiscount], baseLines);
    expect(unmatchEligible).toHaveLength(0);
  });

  describe('applyDiscount calculation', () => {
    it('calculates percentage discounts accurately', () => {
      const result = applyDiscount(200, {
        type: DiscountType.PERCENT,
        value: 15,
      });
      expect(result.discountAmount).toBe(30);
      expect(result.finalAmount).toBe(170);
    });

    it('calculates fixed amount discounts accurately', () => {
      const result = applyDiscount(150, {
        type: DiscountType.FIXED,
        value: 50,
      });
      expect(result.discountAmount).toBe(50);
      expect(result.finalAmount).toBe(100);
    });

    it('caps fixed discount at base amount (prevents negative totals)', () => {
      const result = applyDiscount(40, {
        type: DiscountType.FIXED,
        value: 100,
      });
      expect(result.discountAmount).toBe(40);
      expect(result.finalAmount).toBe(0);
    });
  });
});

