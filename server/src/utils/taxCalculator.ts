export interface TaxInput {
  ratePercent: number;
  active?: boolean;
}

/**
 * Calculates tax amount for a given monetary amount and tax rate.
 *
 * @param amount The pre-tax monetary amount (e.g., 100.0)
 * @param tax Tax record containing `ratePercent` and optional `active` flag
 * @returns The computed tax amount rounded to 2 decimal places (or 0 if tax is inactive)
 *
 * @example
 * calculateTax(100, { ratePercent: 18 }) // 18.00
 * calculateTax(100, { ratePercent: 18, active: false }) // 0.00
 */
export function calculateTax(amount: number, tax: TaxInput): number {
  if (tax.active === false) {
    return 0;
  }
  if (!amount || amount <= 0 || !tax.ratePercent || tax.ratePercent <= 0) {
    return 0;
  }

  const taxAmount = (amount * tax.ratePercent) / 100;
  return Math.round(taxAmount * 100) / 100;
}

/**
 * Calculates line or invoice total including taxes.
 *
 * @param subtotal Net amount before tax
 * @param tax Tax record with ratePercent
 * @returns Object with taxAmount and totalWithTax
 */
export function calculateTotalWithTax(
  subtotal: number,
  tax?: TaxInput | null
): { taxAmount: number; totalWithTax: number } {
  if (!tax) {
    return { taxAmount: 0, totalWithTax: subtotal };
  }
  const taxAmount = calculateTax(subtotal, tax);
  return {
    taxAmount,
    totalWithTax: Math.round((subtotal + taxAmount) * 100) / 100,
  };
}

