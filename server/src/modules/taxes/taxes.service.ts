import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma.js';
import { CreateTaxInput, UpdateTaxInput, ListTaxesQuery } from './taxes.validation.js';

export async function createTax(input: CreateTaxInput) {
  return prisma.tax.create({
    data: {
      name: input.name,
      ratePercent: input.ratePercent,
      active: input.active ?? true,
    },
  });
}

export async function listTaxes(query: ListTaxesQuery) {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const skip = (page - 1) * limit;

  const where: Prisma.TaxWhereInput = {};

  if (query.active !== undefined) {
    where.active = query.active;
  }

  if (query.search) {
    where.name = { contains: query.search, mode: 'insensitive' };
  }

  const [total, items] = await Promise.all([
    prisma.tax.count({ where }),
    prisma.tax.findMany({
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

export async function getTaxById(id: string) {
  return prisma.tax.findUnique({
    where: { id },
  });
}

export async function updateTax(id: string, input: UpdateTaxInput) {
  return prisma.tax.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.ratePercent !== undefined ? { ratePercent: input.ratePercent } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
}

export async function deleteTax(id: string) {
  return prisma.tax.update({
    where: { id },
    data: { active: false },
  });
}

