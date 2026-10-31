import { Role, Prisma } from '@prisma/client';
import prisma from '../../db/prisma.js';
import { hashPassword } from '../../utils/password.js';
import { ConflictError, BadRequestError } from '../auth/auth.service.js';
import { CreateStaffInput, ListUsersQuery } from './users.validation.js';

export async function createStaff(input: CreateStaffInput) {
  const normalizedEmail = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new ConflictError('A user with this email address already exists.');
  }

  const passwordHash = await hashPassword(input.password);

  const staff = await prisma.user.create({
    data: {
      name: input.name,
      email: normalizedEmail,
      passwordHash,
      role: Role.STAFF, // Only STAFF
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return staff;
}

export async function listStaff(query: ListUsersQuery) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: Role.STAFF,
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function updateStaffStatus(id: string, isActive: boolean) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new BadRequestError('User not found.');
  }

  if (user.role !== Role.STAFF) {
    throw new BadRequestError('Only staff accounts can be modified via this endpoint.');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return updated;
}

export async function listCustomers(query: ListUsersQuery) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: Role.CUSTOMER,
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

