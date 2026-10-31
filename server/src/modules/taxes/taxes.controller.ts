import { Request, Response, NextFunction } from 'express';
import {
  createTaxSchema,
  updateTaxSchema,
  listTaxesQuerySchema,
} from './taxes.validation.js';
import * as taxesService from './taxes.service.js';

export async function createTax(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createTaxSchema.parse(req.body);
    const tax = await taxesService.createTax(validated);
    res.status(201).json({
      message: 'Tax rate created successfully',
      tax,
    });
  } catch (err) {
    next(err);
  }
}

export async function listTaxes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listTaxesQuerySchema.parse(req.query);
    const result = await taxesService.listTaxes(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTax(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const tax = await taxesService.getTaxById(id);
    if (!tax) {
      res.status(404).json({ message: 'Tax rate not found' });
      return;
    }
    res.status(200).json({ tax });
  } catch (err) {
    next(err);
  }
}

export async function updateTax(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const validated = updateTaxSchema.parse(req.body);
    const tax = await taxesService.updateTax(id, validated);
    res.status(200).json({
      message: 'Tax rate updated successfully',
      tax,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTax(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await taxesService.deleteTax(id);
    res.status(200).json({ message: 'Tax deactivated successfully' });
  } catch (err) {
    next(err);
  }
}

