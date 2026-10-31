import { describe, it, expect } from 'vitest';
import { Role } from '@prisma/client';
import {
  resolveCustomerIdScope,
  applyCustomerScope,
  ForbiddenError,
  AuthenticatedUser,
} from '../utils/customerScope.js';

describe('Customer Data Scoping Helper', () => {
  const customerUser: AuthenticatedUser = {
    id: 'cust-123',
    name: 'Customer A',
    email: 'custA@example.com',
    role: Role.CUSTOMER,
    isActive: true,
  };

  const adminUser: AuthenticatedUser = {
    id: 'admin-999',
    name: 'Admin',
    email: 'admin@example.com',
    role: Role.ADMIN,
    isActive: true,
  };

  const staffUser: AuthenticatedUser = {
    id: 'staff-888',
    name: 'Staff',
    email: 'staff@example.com',
    role: Role.STAFF,
    isActive: true,
  };

  it('scopes customer queries strictly to their own ID', () => {
    const scopedId = resolveCustomerIdScope(customerUser);
    expect(scopedId).toBe('cust-123');
  });

  it('throws ForbiddenError if customer requests another customerId', () => {
    expect(() => {
      resolveCustomerIdScope(customerUser, 'cust-456');
    }).toThrow(ForbiddenError);
  });

  it('allows customer if requestedCustomerId matches their own ID', () => {
    const scopedId = resolveCustomerIdScope(customerUser, 'cust-123');
    expect(scopedId).toBe('cust-123');
  });

  it('allows admin to query all records when no target is specified', () => {
    const scopedId = resolveCustomerIdScope(adminUser);
    expect(scopedId).toBeUndefined();
  });

  it('allows admin and staff to query a specific customerId', () => {
    expect(resolveCustomerIdScope(adminUser, 'cust-123')).toBe('cust-123');
    expect(resolveCustomerIdScope(staffUser, 'cust-456')).toBe('cust-456');
  });

  it('correctly modifies Prisma where clause via applyCustomerScope', () => {
    const where = applyCustomerScope(customerUser, { status: 'ACTIVE' });
    expect(where).toEqual({
      status: 'ACTIVE',
      customerId: 'cust-123',
    });
  });
});

