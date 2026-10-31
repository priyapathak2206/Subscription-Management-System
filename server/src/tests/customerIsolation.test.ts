import { describe, it, expect } from 'vitest';
import { Role } from '@prisma/client';
import { resolveCustomerIdScope, applyCustomerScope } from '../utils/customerScope.js';

describe('Customer Multi-Tenant Isolation & Role Scoping', () => {
  const customerUser = {
    id: 'cust-uuid-111',
    role: Role.CUSTOMER,
  };

  const adminUser = {
    id: 'admin-uuid-999',
    role: Role.ADMIN,
  };

  const staffUser = {
    id: 'staff-uuid-888',
    role: Role.STAFF,
  };

  it('restricts customer role strictly to their own customer ID', () => {
    // When customer passes no customerId query
    const scopedId = resolveCustomerIdScope(customerUser);
    expect(scopedId).toBe('cust-uuid-111');
  });

  it('rejects customer attempting to access another customer ID with 403 Forbidden', () => {
    expect(() => {
      resolveCustomerIdScope(customerUser, 'cust-uuid-222');
    }).toThrow(/Forbidden/);
  });

  it('allows customer to query explicitly for their own customer ID', () => {
    const scopedId = resolveCustomerIdScope(customerUser, 'cust-uuid-111');
    expect(scopedId).toBe('cust-uuid-111');
  });

  it('allows Admin and Staff to view all customers or filter by a specific customer', () => {
    // Admin without filter
    expect(resolveCustomerIdScope(adminUser)).toBeUndefined();
    // Admin with filter
    expect(resolveCustomerIdScope(adminUser, 'cust-uuid-222')).toBe('cust-uuid-222');

    // Staff without filter
    expect(resolveCustomerIdScope(staffUser)).toBeUndefined();
    // Staff with filter
    expect(resolveCustomerIdScope(staffUser, 'cust-uuid-333')).toBe('cust-uuid-333');
  });

  it('correctly applies customer scoping into Prisma where clauses', () => {
    const baseWhere = { status: 'ACTIVE' };
    const scopedWhere = applyCustomerScope(baseWhere, customerUser);

    expect(scopedWhere).toEqual({
      status: 'ACTIVE',
      customerId: 'cust-uuid-111',
    });
  });
});

