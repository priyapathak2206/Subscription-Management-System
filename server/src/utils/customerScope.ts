import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = 'Access forbidden: You can only access your own data') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Validates and enforces customer data isolation.
 *
 * Requirements:
 * - Customers may ONLY access records where `customerId === user.id`.
 * - If a CUSTOMER specifies a targetCustomerId that does not match their own ID, a 403 Forbidden is thrown.
 * - ADMIN and STAFF have global access, but can optionally filter by targetCustomerId.
 *
 * @param user The authenticated user making the request (from req.user)
 * @param requestedCustomerId Optional customer ID passed in the query or body
 * @returns The resolved customerId to filter by, or undefined if global view is permitted
 * @throws ForbiddenError if a customer attempts to access data outside their account
 *
 * @example
 * // In subscription or invoice query controllers:
 * const customerId = resolveCustomerIdScope(req.user, req.query.customerId as string);
 * const where = customerId ? { customerId } : {};
 * const subscriptions = await prisma.subscription.findMany({ where });
 */
export function resolveCustomerIdScope(
  user: AuthenticatedUser,
  requestedCustomerId?: string
): string | undefined {
  if (user.role === Role.CUSTOMER) {
    if (requestedCustomerId && requestedCustomerId !== user.id) {
      throw new ForbiddenError('Customers may only access their own data.');
    }
    return user.id;
  }

  // Admin and Staff can view all, or optionally filter by requested customer
  return requestedCustomerId || undefined;
}

/**
 * Injects customer isolation criteria into any Prisma `where` clause.
 *
 * @param user The authenticated user
 * @param existingWhere Existing Prisma where conditions
 * @param customerIdField The key used for customer identifier (defaults to 'customerId')
 * @returns Combined where condition with customer scoping enforced
 *
 * @example
 * const where = applyCustomerScope(req.user, { status: 'ACTIVE' }, 'customerId');
 * const data = await prisma.subscription.findMany({ where });
 */
export function applyCustomerScope<T extends Record<string, any>>(
  user: AuthenticatedUser,
  existingWhere: T = {} as T,
  customerIdField: string = 'customerId'
): T & Record<string, any> {
  const customerId = resolveCustomerIdScope(user, existingWhere[customerIdField]);
  if (!customerId) {
    return existingWhere;
  }

  return {
    ...existingWhere,
    [customerIdField]: customerId,
  };
}

