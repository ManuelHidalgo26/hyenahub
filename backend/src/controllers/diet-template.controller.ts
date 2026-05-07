import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";

const mealSchema = z.object({
  name: z.string().min(1),
  time: z.string().optional(),
  foods: z.string().min(1),
  calories: z.number().int().optional(),
  protein: z.number().int().optional(),
  carbs: z.number().int().optional(),
  fat: z.number().int().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  calories: z.number().int().optional(),
  protein: z.number().int().optional(),
  carbs: z.number().int().optional(),
  fat: z.number().int().optional(),
  meals: z.array(mealSchema).optional(),
});

// GET /diet-templates — list templates for the authenticated trainer
export async function getDietTemplates(req: AuthRequest, res: Response) {
  const templates = await prisma.dietTemplate.findMany({
    where: { trainerId: req.user!.profileId },
    orderBy: { createdAt: "desc" },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  res.json({ success: true, data: templates });
}

// POST /diet-templates — create a template with optional meals
export async function createDietTemplate(req: AuthRequest, res: Response) {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { meals, ...rest } = parsed.data;

  const template = await prisma.dietTemplate.create({
    data: {
      ...rest,
      trainerId: req.user!.profileId,
      meals: meals?.length
        ? { create: meals.map((m, i) => ({ ...m, order: m.order ?? i })) }
        : undefined,
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  res.status(201).json({ success: true, data: template });
}

// PATCH /diet-templates/:id — update template fields (replaces meals if provided)
export async function updateDietTemplate(req: AuthRequest, res: Response) {
  const template = await prisma.dietTemplate.findFirst({
    where: { id: req.params.id as string, trainerId: req.user!.profileId },
  });

  if (!template) {
    res.status(404).json({ success: false, error: "Template no encontrado" });
    return;
  }

  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { meals, ...rest } = parsed.data;

  if (meals !== undefined) {
    // Replace all meals atomically
    await prisma.dietTemplateMeal.deleteMany({ where: { templateId: template.id } });
    await prisma.dietTemplateMeal.createMany({
      data: meals.map((m, i) => ({ ...m, templateId: template.id, order: m.order ?? i })),
    });
  }

  const updated = await prisma.dietTemplate.update({
    where: { id: template.id },
    data: rest,
    include: { meals: { orderBy: { order: "asc" } } },
  });

  res.json({ success: true, data: updated });
}

// DELETE /diet-templates/:id
export async function deleteDietTemplate(req: AuthRequest, res: Response) {
  const template = await prisma.dietTemplate.findFirst({
    where: { id: req.params.id as string, trainerId: req.user!.profileId },
  });

  if (!template) {
    res.status(404).json({ success: false, error: "Template no encontrado" });
    return;
  }

  await prisma.dietTemplate.delete({ where: { id: template.id as string } });

  res.json({ success: true, message: "Template eliminado" });
}
