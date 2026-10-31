import { DiscountType, DiscountAppliesTo } from '@prisma/client';

export interface DiscountProductRef {
  productId: string;
}

export interface DiscountItem {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  minPurchase?: number | null;
  minQuantity?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
  appliesTo: DiscountAppliesTo;
  isActive: boolean;
  discountProducts?: DiscountProductRef[];
}

export interface OrderLineItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface DiscountEligibilityContext {
  date?: Date;
  subtotal?: number;
  totalQuantity?: number;
}

/**
 * Filters a list of candidate discounts against an order or subscription, returning only eligible discounts.
 *
 * Checks enforced:
 * 1. Must be active (isActive === true)
 * 2. Not-yet-started discounts ignored (startDate > evaluation date)
 * 3. Expired discounts ignored (endDate < evaluation date)
 * 4. Exhausted discounts ignored (usageLimit !== null && usedCount >= usageLimit)
 * 5. Minimum purchase condition (minPurchase !== null && subtotal < minPurchase)
 * 6. Minimum total quantity condition (minQuantity !== null && totalQuantity < minQuantity)
 * 7. For PRODUCT discounts: must apply to at least one product in `lines`
 *
 * @param discounts List of candidate discounts (e.g. from prisma.discount.findMany)
 * @param lines The line items in the subscription or invoice
 * @param context Optional evaluation context containing date, subtotal, and total quantity overrides
 * @returns Array of eligible discounts
 *
 * @note
 * TRANSACTION REQUIREMENT FOR INVOICE/BILLING ENGINE:
 * When applying an eligible discount, the caller MUST increment the discount's `usedCount`
 * inside the same database transaction:
 * ```ts
 * await tx.discount.update({
 *   where: { id: discount.id },
 *   data: { usedCount: { increment: 1 } }
 * });
 * ```
 */
export function getEligibleDiscounts(
  discounts: DiscountItem[],
  lines: OrderLineItem[],
  context: DiscountEligibilityContext = {}
): DiscountItem[] {
  const evalDate = context.date || new Date();
  const subtotal = context.subtotal ?? lines.reduce((acc, line) => acc + (line.amount || line.unitPrice * line.quantity), 0);
  const totalQuantity = context.totalQuantity ?? lines.reduce((acc, line) => acc + line.quantity, 0);

  const productIdsInOrder = new Set(lines.map((l) => l.productId));

  return discounts.filter((discount) => {
    // 1. Inactive check
    if (!discount.isActive) {
      return false;
    }

    // 2. Start date check (not yet started)
    if (discount.startDate && new Date(discount.startDate) > evalDate) {
      return false;
    }

    // 3. End date check (expired)
    if (discount.endDate && new Date(discount.endDate) < evalDate) {
      return false;
    }

    // 4. Usage limit check (exhausted)
    if (discount.usageLimit !== null && discount.usageLimit !== undefined) {
      if (discount.usedCount >= discount.usageLimit) {
        return false;
      }
    }

    // 5. Minimum purchase check
    if (discount.minPurchase !== null && discount.minPurchase !== undefined) {
      if (subtotal < discount.minPurchase) {
        return false;
      }
    }

    // 6. Minimum quantity check
    if (discount.minQuantity !== null && discount.minQuantity !== undefined) {
      if (totalQuantity < discount.minQuantity) {
        return false;
      }
    }

    // 7. PRODUCT vs SUBSCRIPTION target check
    if (discount.appliesTo === DiscountAppliesTo.PRODUCT) {
      if (!discount.discountProducts || discount.discountProducts.length === 0) {
        return false;
      }
      const hasMatchingProduct = discount.discountProducts.some((dp) =>
        productIdsInOrder.has(dp.productId)
      );
      if (!hasMatchingProduct) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculates discount amount and post-discount total for a given base amount.
 *
 * @param amount The base monetary amount to discount
 * @param discount The discount record to apply
 * @returns Object containing computed `discountAmount` and resulting `finalAmount`
 *
 * @example
 * applyDiscount(200, { type: DiscountType.PERCENT, value: 20 })
 * // { discountAmount: 40, finalAmount: 160 }
 *
 * applyDiscount(50, { type: DiscountType.FIXED, value: 100 })
 * // { discountAmount: 50, finalAmount: 0 }
 */
export function applyDiscount(
  amount: number,
  discount: Pick<DiscountItem, 'type' | 'value'>
): { discountAmount: number; finalAmount: number } {
  if (!amount || amount <= 0 || !discount.value || discount.value <= 0) {
    return { discountAmount: 0, finalAmount: Math.max(0, amount) };
  }

  let discountAmount = 0;
  if (discount.type === DiscountType.PERCENT) {
    discountAmount = (amount * discount.value) / 100;
  } else if (discount.type === DiscountType.FIXED) {
    discountAmount = Math.min(amount, discount.value);
  }

  discountAmount = Math.round(discountAmount * 100) / 100;
  const finalAmount = Math.max(0, Math.round((amount - discountAmount) * 100) / 100);

  return { discountAmount, finalAmount };
}

