import { Request, Response } from 'express';
import { prisma } from '../../db/prisma.js';

export async function listQuotationTemplates(req: Request, res: Response) {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ templates });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch quotation templates' });
  }
}

export async function getQuotationTemplateById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const template = await prisma.quotationTemplate.findUnique({
      where: { id },
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ message: 'Quotation template not found' });
    }

    res.json({ template });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch quotation template' });
  }
}

export async function createQuotationTemplate(req: Request, res: Response) {
  try {
    const { name, planId, validityDays = 30, lines = [] } = req.body;

    if (!name || !planId) {
      return res.status(400).json({ message: 'Name and planId are required' });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ message: 'Selected plan not found' });
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        name,
        planId,
        validityDays: Number(validityDays) || 30,
        lines: {
          create: lines.map((line: any) => ({
            productId: line.productId,
            variantId: line.variantId || null,
            quantity: Number(line.quantity) || 1,
            unitPrice: line.unitPrice !== undefined ? Number(line.unitPrice) : null,
          })),
        },
      },
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    res.status(201).json({ template });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create quotation template' });
  }
}

export async function updateQuotationTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, planId, validityDays, lines } = req.body;

    const existing = await prisma.quotationTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Quotation template not found' });
    }

    const template = await prisma.$transaction(async (tx) => {
      if (lines && Array.isArray(lines)) {
        await tx.quotationTemplateLine.deleteMany({
          where: { quotationTemplateId: id },
        });
      }

      return tx.quotationTemplate.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(planId && { planId }),
          ...(validityDays !== undefined && { validityDays: Number(validityDays) }),
          ...(lines && Array.isArray(lines) && {
            lines: {
              create: lines.map((line: any) => ({
                productId: line.productId,
                variantId: line.variantId || null,
                quantity: Number(line.quantity) || 1,
                unitPrice: line.unitPrice !== undefined ? Number(line.unitPrice) : null,
              })),
            },
          }),
        },
        include: {
          plan: true,
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });
    });

    res.json({ template });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update quotation template' });
  }
}

export async function deleteQuotationTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.quotationTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Quotation template not found' });
    }

    await prisma.quotationTemplate.delete({ where: { id } });
    res.json({ message: 'Quotation template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete quotation template' });
  }
}

