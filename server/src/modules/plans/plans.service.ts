import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma.js';
import { CreatePlanInput, UpdatePlanInput, ListPlansQuery } from './plans.validation.js';

export async function createPlan(input: CreatePlanInput) {
  return prisma.plan.create({
    data: {
      name: input.name,
      price: input.price,
      billingPeriod: input.billingPeriod,
      minQuantity: input.minQuantity ?? 1,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      autoClose: input.autoClose ?? false,
      closable: input.closable ?? true,
      pausable: input.pausable ?? true,
      renewable: input.renewable ?? true,
      isActive: input.isActive ?? true,
    },
  });
}

export async function listPlans(query: ListPlansQuery) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.PlanWhereInput = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.billingPeriod) {
    where.billingPeriod = query.billingPeriod;
  }

  if (query.search) {
    where.name = { contains: query.search, mode: 'insensitive' };
  }

  const [total, items] = await Promise.all([
    prisma.plan.count({ where }),
    prisma.plan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

export async function getPlanById(id: string) {
  return prisma.plan.findUnique({
    where: { id },
  });
}

export async function updatePlan(id: string, input: UpdatePlanInput) {
  return prisma.plan.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.billingPeriod !== undefined ? { billingPeriod: input.billingPeriod } : {}),
      ...(input.minQuantity !== undefined ? { minQuantity: input.minQuantity } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.autoClose !== undefined ? { autoClose: input.autoClose } : {}),
      ...(input.closable !== undefined ? { closable: input.closable } : {}),
      ...(input.pausable !== undefined ? { pausable: input.pausable } : {}),
      ...(input.renewable !== undefined ? { renewable: input.renewable } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deletePlan(id: string) {
  return prisma.plan.update({
    where: { id },
    data: { isActive: false },
  });
}

