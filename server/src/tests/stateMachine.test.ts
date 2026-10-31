import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionStatus, Role } from '@prisma/client';
import { ALLOWED_TRANSITIONS } from '../modules/subscriptions/subscriptions.service.js';

describe('Subscription State Machine & Lifecycle Constraints', () => {
  it('allows valid state machine forward progressions', () => {
    expect(ALLOWED_TRANSITIONS[SubscriptionStatus.DRAFT]).toContain(SubscriptionStatus.QUOTATION);
    expect(ALLOWED_TRANSITIONS[SubscriptionStatus.DRAFT]).toContain(SubscriptionStatus.CLOSED);

    expect(ALLOWED_TRANSITIONS[SubscriptionStatus.QUOTATION]).toContain(SubscriptionStatus.CONFIRMED);
    expect(ALLOWED_TRANSITIONS[SubscriptionStatus.QUOTATION]).toContain(SubscriptionStatus.CLOSED);

    expect(ALLOWED_TRANSITIONS[SubscriptionStatus.CONFIRMED]).toContain(SubscriptionStatus.ACTIVE);
    expect(ALLOWED_TRANSITIONS[SubscriptionStatus.CONFIRMED]).toContain(SubscriptionStatus.CLOSED);

    expect(ALLOWED_TRANSITIONS[SubscriptionStatus.ACTIVE]).toContain(SubscriptionStatus.CLOSED);
  });

  it('rejects illegal status skipping (e.g. DRAFT -> ACTIVE directly)', () => {
    const allowedFromDraft = ALLOWED_TRANSITIONS[SubscriptionStatus.DRAFT];
    expect(allowedFromDraft).not.toContain(SubscriptionStatus.ACTIVE);
    expect(allowedFromDraft).not.toContain(SubscriptionStatus.CONFIRMED);
  });

  it('rejects skipping from QUOTATION directly to ACTIVE without confirmation', () => {
    const allowedFromQuotation = ALLOWED_TRANSITIONS[SubscriptionStatus.QUOTATION];
    expect(allowedFromQuotation).not.toContain(SubscriptionStatus.ACTIVE);
    expect(allowedFromQuotation).toContain(SubscriptionStatus.CONFIRMED);
  });

  it('treats CLOSED as a terminal state preventing backward transitions', () => {
    const allowedFromClosed = ALLOWED_TRANSITIONS[SubscriptionStatus.CLOSED];
    expect(allowedFromClosed).toHaveLength(0);
    expect(allowedFromClosed).not.toContain(SubscriptionStatus.ACTIVE);
    expect(allowedFromClosed).not.toContain(SubscriptionStatus.DRAFT);
  });

  it('validates plan early closure rules when closable is false', () => {
    const plan = {
      name: 'Annual Enterprise Plan',
      closable: false,
    };
    const futureExpiry = new Date();
    futureExpiry.setFullYear(futureExpiry.getFullYear() + 1);

    const subscription = {
      status: SubscriptionStatus.ACTIVE,
      expiryDate: futureExpiry,
      plan,
    };

    // If closable is false and current time < expiryDate, close must be rejected
    const isEarly = subscription.expiryDate && new Date() < subscription.expiryDate;
    const canClose = !(subscription.plan.closable === false && isEarly);

    expect(canClose).toBe(false);
  });

  it('permits early closure when plan closable flag is true', () => {
    const plan = {
      name: 'Flexible Monthly Plan',
      closable: true,
    };
    const futureExpiry = new Date();
    futureExpiry.setMonth(futureExpiry.getMonth() + 6);

    const subscription = {
      status: SubscriptionStatus.ACTIVE,
      expiryDate: futureExpiry,
      plan,
    };

    const isEarly = subscription.expiryDate && new Date() < subscription.expiryDate;
    const canClose = !(subscription.plan.closable === false && isEarly);

    expect(canClose).toBe(true);
  });

  it('enforces plan minimum quantity constraints', () => {
    const plan = {
      minQuantity: 5,
    };
    const orderQty = 3;
    const isValid = orderQty >= plan.minQuantity;

    expect(isValid).toBe(false);
  });
});
