import { Request, Response, NextFunction } from 'express';
import {
  createDiscountSchema,
  updateDiscountSchema,
  listDiscountsQuerySchema,
} from './discounts.validation.js';
import * as discountsService from './discounts.service.js';

export async function createDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createDiscountSchema.parse(req.body);
    const discount = await discountsService.createDiscount(validated);
    res.status(201).json({
      message: 'Discount created successfully',
      discount,
    });
  } catch (err) {
    next(err);
  }
}

export async function listDiscounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listDiscountsQuerySchema.parse(req.query);
    const result = await discountsService.listDiscounts(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const discount = await discountsService.getDiscountById(id);
    if (!discount) {
      res.status(404).json({ message: 'Discount not found' });
      return;
    }
    res.status(200).json({ discount });
  } catch (err) {
    next(err);
  }
}

export async function updateDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const validated = updateDiscountSchema.parse(req.body);
    const discount = await discountsService.updateDiscount(id, validated);
    res.status(200).json({
      message: 'Discount updated successfully',
      discount,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await discountsService.deleteDiscount(id);
    res.status(200).json({ message: 'Discount deactivated successfully' });
  } catch (err) {
    next(err);
  }
}

