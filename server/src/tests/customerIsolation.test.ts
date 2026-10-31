import { describe, it, expect } from 'vitest';
import { Role } from '@prisma/client';
import { resolveCustomerIdScope, applyCustomerScope } from '../utils/customerScope.js';

describe('Customer Multi-Tenant Isolation & Role Scoping', () => {
  const customerUser = {
    id: 'cust-uuid-111',
    name: 'Customer One',
    email: 'cust1@example.com',
    role: Role.CUSTOMER,
    isActive: true,
  };

  const adminUser = {
    id: 'admin-uuid-999',
    name: 'Admin User',
    email: 'admin@example.com',
    role: Role.ADMIN,
    isActive: true,
  };

  const staffUser = {
    id: 'staff-uuid-888',
    name: 'Staff User',
    email: 'staff@example.com',
    role: Role.STAFF,
    isActive: true,
  };

  it('restricts customer role strictly to their own customer ID', () => {
    // When customer passes no customerId query
    const scopedId = resolveCustomerIdScope(customerUser);
    expect(scopedId).toBe('cust-uuid-111');
  });

  it('rejects customer attempting to access another customer ID with 403 Forbidden', () => {
    expect(() => {
      resolveCustomerIdScope(customerUser, 'cust-uuid-222');
    }).toThrow(/Customers may only access their own data/i);
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
    const scopedWhere = applyCustomerScope(customerUser, baseWhere);

    expect(scopedWhere).toEqual({
      status: 'ACTIVE',
      customerId: 'cust-uuid-111',
    });
  });
});
