import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma.js';
import { CreateProductInput, UpdateProductInput, ListProductsQuery, ProductVariantInput } from './products.validation.js';

export function enrichProductWithFinalPrices<
  T extends { salesPrice: number; variants?: Array<{ extraPrice: number }> }
>(product: T) {
  if (!product.variants) return product;

  const enrichedVariants = product.variants.map((v) => ({
    ...v,
    finalPrice: Math.round((product.salesPrice + v.extraPrice) * 100) / 100,
  }));

  return {
    ...product,
    variants: enrichedVariants,
  };
}

export async function createProduct(input: CreateProductInput) {
  const { variants, ...productData } = input;

  const product = await prisma.product.create({
    data: {
      name: productData.name,
      type: productData.type,
      salesPrice: productData.salesPrice,
      costPrice: productData.costPrice,
      notes: productData.notes || null,
      isActive: productData.isActive ?? true,
      ...(variants && variants.length > 0
        ? {
            variants: {
              create: variants.map((v) => ({
                attribute: v.attribute,
                value: v.value,
                extraPrice: v.extraPrice ?? 0,
              })),
            },
          }
        : {}),
    },
    include: {
      variants: true,
    },
  });

  return enrichProductWithFinalPrices(product);
}

export async function listProducts(query: ListProductsQuery) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
      { type: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, rawProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
      },
    }),
  ]);

  const items = rawProducts.map((p) => enrichProductWithFinalPrices(p));

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

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
    },
  });

  if (!product) return null;
  return enrichProductWithFinalPrices(product);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const { variants, ...productData } = input;

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update product scalar fields
    const product = await tx.product.update({
      where: { id },
      data: {
        ...(productData.name !== undefined ? { name: productData.name } : {}),
        ...(productData.type !== undefined ? { type: productData.type } : {}),
        ...(productData.salesPrice !== undefined ? { salesPrice: productData.salesPrice } : {}),
        ...(productData.costPrice !== undefined ? { costPrice: productData.costPrice } : {}),
        ...(productData.notes !== undefined ? { notes: productData.notes } : {}),
        ...(productData.isActive !== undefined ? { isActive: productData.isActive } : {}),
      },
    });

    // 2. If variants array is provided, sync variants
    if (variants !== undefined) {
      // Delete existing variants and re-create, or upsert
      await tx.productVariant.deleteMany({
        where: { productId: id },
      });

      if (variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((v) => ({
            productId: id,
            attribute: v.attribute,
            value: v.value,
            extraPrice: v.extraPrice ?? 0,
          })),
        });
      }
    }

    return tx.product.findUnique({
      where: { id },
      include: { variants: true },
    });
  });

  if (!updated) return null;
  return enrichProductWithFinalPrices(updated);
}

export async function deleteProduct(id: string) {
  // Soft delete to protect relational integrity with subscription/invoice lines
  return prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function addProductVariant(productId: string, variant: ProductVariantInput) {
  const newVariant = await prisma.productVariant.create({
    data: {
      productId,
      attribute: variant.attribute,
      value: variant.value,
      extraPrice: variant.extraPrice ?? 0,
    },
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { salesPrice: true },
  });

  return {
    ...newVariant,
    finalPrice: product ? Math.round((product.salesPrice + newVariant.extraPrice) * 100) / 100 : newVariant.extraPrice,
  };
}

export async function deleteProductVariant(variantId: string) {
  return prisma.productVariant.delete({
    where: { id: variantId },
  });
}

