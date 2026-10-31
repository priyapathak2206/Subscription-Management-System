import { Request, Response, NextFunction } from 'express';
import {
  createPlanSchema,
  updatePlanSchema,
  listPlansQuerySchema,
} from './plans.validation.js';
import * as plansService from './plans.service.js';

export async function createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createPlanSchema.parse(req.body);
    const plan = await plansService.createPlan(validated);
    res.status(201).json({
      message: 'Plan created successfully',
      plan,
    });
  } catch (err) {
    next(err);
  }
}

export async function listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listPlansQuerySchema.parse(req.query);
    const result = await plansService.listPlans(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const plan = await plansService.getPlanById(id);
    if (!plan) {
      res.status(404).json({ message: 'Plan not found' });
      return;
    }
    res.status(200).json({ plan });
  } catch (err) {
    next(err);
  }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const validated = updatePlanSchema.parse(req.body);
    const plan = await plansService.updatePlan(id, validated);
    res.status(200).json({
      message: 'Plan updated successfully',
      plan,
    });
  } catch (err) {
    next(err);
  }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await plansService.deletePlan(id);
    res.status(200).json({ message: 'Plan deactivated successfully' });
  } catch (err) {
    next(err);
  }
}

