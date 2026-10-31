import { Request, Response, NextFunction } from 'express';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  productVariantInputSchema,
} from './products.validation.js';
import * as productsService from './products.service.js';

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createProductSchema.parse(req.body);
    const product = await productsService.createProduct(validated);
    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (err) {
    next(err);
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listProductsQuerySchema.parse(req.query);
    const result = await productsService.listProducts(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const product = await productsService.getProductById(id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const validated = updateProductSchema.parse(req.body);
    const updated = await productsService.updateProduct(id, validated);
    if (!updated) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.status(200).json({
      message: 'Product updated successfully',
      product: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await productsService.deleteProduct(id);
    res.status(200).json({ message: 'Product deactivated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function addVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const validated = productVariantInputSchema.parse(req.body);
    const variant = await productsService.addProductVariant(id, validated);
    res.status(201).json({
      message: 'Variant added successfully',
      variant,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { variantId } = req.params;
    await productsService.deleteProductVariant(variantId);
    res.status(200).json({ message: 'Variant removed successfully' });
  } catch (err) {
    next(err);
  }
}

