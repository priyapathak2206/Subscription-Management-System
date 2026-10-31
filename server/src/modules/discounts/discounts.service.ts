import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma.js';
import { CreateDiscountInput, UpdateDiscountInput, ListDiscountsQuery } from './discounts.validation.js';

export async function createDiscount(input: CreateDiscountInput) {
  const { productIds, ...discountData } = input;

  return prisma.discount.create({
    data: {
      name: discountData.name,
      type: discountData.type,
      value: discountData.value,
      minPurchase: discountData.minPurchase ?? null,
      minQuantity: discountData.minQuantity ?? null,
      startDate: discountData.startDate ?? null,
      endDate: discountData.endDate ?? null,
      usageLimit: discountData.usageLimit ?? null,
      usedCount: 0,
      appliesTo: discountData.appliesTo,
      isActive: discountData.isActive ?? true,
      ...(productIds && productIds.length > 0
        ? {
            discountProducts: {
              create: productIds.map((productId) => ({
                productId,
              })),
            },
          }
        : {}),
    },
    include: {
      discountProducts: {
        include: {
          product: {
            select: { id: true, name: true, salesPrice: true },
          },
        },
      },
    },
  });
}

export async function listDiscounts(query: ListDiscountsQuery) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.DiscountWhereInput = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.appliesTo) {
    where.appliesTo = query.appliesTo;
  }

  if (query.search) {
    where.name = { contains: query.search, mode: 'insensitive' };
  }

  const [total, items] = await Promise.all([
    prisma.discount.count({ where }),
    prisma.discount.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        discountProducts: {
          include: {
            product: {
              select: { id: true, name: true, salesPrice: true },
            },
          },
        },
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

export async function getDiscountById(id: string) {
  return prisma.discount.findUnique({
    where: { id },
    include: {
      discountProducts: {
        include: {
          product: {
            select: { id: true, name: true, salesPrice: true },
          },
        },
      },
    },
  });
}

export async function updateDiscount(id: string, input: UpdateDiscountInput) {
  const { productIds, ...discountData } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Update scalar fields
    await tx.discount.update({
      where: { id },
      data: {
        ...(discountData.name !== undefined ? { name: discountData.name } : {}),
        ...(discountData.type !== undefined ? { type: discountData.type } : {}),
        ...(discountData.value !== undefined ? { value: discountData.value } : {}),
        ...(discountData.minPurchase !== undefined ? { minPurchase: discountData.minPurchase } : {}),
        ...(discountData.minQuantity !== undefined ? { minQuantity: discountData.minQuantity } : {}),
        ...(discountData.startDate !== undefined ? { startDate: discountData.startDate } : {}),
        ...(discountData.endDate !== undefined ? { endDate: discountData.endDate } : {}),
        ...(discountData.usageLimit !== undefined ? { usageLimit: discountData.usageLimit } : {}),
        ...(discountData.appliesTo !== undefined ? { appliesTo: discountData.appliesTo } : {}),
        ...(discountData.isActive !== undefined ? { isActive: discountData.isActive } : {}),
      },
    });

    // 2. If productIds are provided, re-sync join table
    if (productIds !== undefined) {
      await tx.discountProduct.deleteMany({
        where: { discountId: id },
      });

      if (productIds.length > 0) {
        await tx.discountProduct.createMany({
          data: productIds.map((productId) => ({
            discountId: id,
            productId,
          })),
        });
      }
    }

    return tx.discount.findUnique({
      where: { id },
      include: {
        discountProducts: {
          include: {
            product: {
              select: { id: true, name: true, salesPrice: true },
            },
          },
        },
      },
    });
  });
}

export async function deleteDiscount(id: string) {
  return prisma.discount.update({
    where: { id },
    data: { isActive: false },
  });
}

