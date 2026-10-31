import { Request, Response, NextFunction } from 'express';
import {
  createStaffSchema,
  updateStaffStatusSchema,
  listUsersQuerySchema,
} from './users.validation.js';
import * as usersService from './users.service.js';

export async function createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = createStaffSchema.parse(req.body);
    const staff = await usersService.createStaff(validatedData);
    res.status(201).json({
      message: 'Staff member created successfully',
      staff,
    });
  } catch (err) {
    next(err);
  }
}

export async function listStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await usersService.listStaff(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateStaffStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive } = updateStaffStatusSchema.parse(req.body);
    const updated = await usersService.updateStaffStatus(id, isActive);
    res.status(200).json({
      message: `Staff member ${isActive ? 'activated' : 'deactivated'} successfully`,
      staff: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await usersService.listCustomers(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

