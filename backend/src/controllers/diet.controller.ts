import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";
import { auditLog } from "../services/audit.service";

/* ─── Zod schemas ────────────────────────────────────────────────────────────── */

const mealSchema = z.object({
  name:     z.string().min(1),
  time:     z.string().optional(),
  foods:    z.string().min(1),
  calories: z.number().int().nonnegative().optional(),
  protein:  z.number().int().nonnegative().optional(),
  carbs:    z.number().int().nonnegative().optional(),
  fat:      z.number().int().nonnegative().optional(),
  notes:    z.string().optional(),
  order:    z.number().int().optional(),
});

const createDietSchema = z.object({
  clientId:    z.string(),
  name:        z.string().min(1),
  description: z.string().optional(),
  calories:    z.number().int().nonnegative().optional(),
  protein:     z.number().int().nonnegative().optional(),
  carbs:       z.number().int().nonnegative().optional(),
  fat:         z.number().int().nonnegative().optional(),
  meals:       z.array(mealSchema).min(1),
});

const updateDietSchema = createDietSchema.partial().omit({ clientId: true });

/* ─── Trainer: create a diet for a client ──────────────────────────────────── */
export async function createDiet(req: AuthRequest, res: Response) {
  const parsed = createDietSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { clientId, name, description, calories, protein, carbs, fat, meals } = parsed.data;

  // Verify the client belongs to this trainer
  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: req.user!.profileId },
  });
  if (!client) {
    res.status(403).json({ success: false, error: "Cliente no encontrado o sin acceso" });
    return;
  }

  const diet = await prisma.diet.create({
    data: {
      clientId,
      trainerId: req.user!.profileId,
      name,
      description,
      calories,
      protein,
      carbs,
      fat,
      meals: {
        create: meals.map((m, i) => ({ ...m, order: m.order ?? i })),
      },
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  res.status(201).json({ success: true, data: diet });
}

/* ─── Trainer: get all diets for a specific client ─────────────────────────── */
export async function getDietsByClient(req: AuthRequest, res: Response) {
  const clientId = req.params.clientId as string;
  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: req.user!.profileId },
  });
  if (!client) {
    res.status(403).json({ success: false, error: "Acceso denegado" });
    return;
  }

  const diets = await prisma.diet.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  res.json({ success: true, data: diets });
}

/* ─── Trainer: update a diet ────────────────────────────────────────────────── */
export async function updateDiet(req: AuthRequest, res: Response) {
  const parsed = updateDietSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const dietId = req.params.dietId as string;
  // Verify ownership
  const existing = await prisma.diet.findFirst({
    where: { id: dietId, trainerId: req.user!.profileId },
  });
  if (!existing) {
    res.status(403).json({ success: false, error: "Dieta no encontrada o sin acceso" });
    return;
  }

  const { name, description, calories, protein, carbs, fat, meals } = parsed.data;

  // Replace meals: delete old + create new
  await prisma.meal.deleteMany({ where: { dietId } });

  const diet = await prisma.diet.update({
    where: { id: dietId },
    data: {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(calories    !== undefined && { calories }),
      ...(protein     !== undefined && { protein }),
      ...(carbs       !== undefined && { carbs }),
      ...(fat         !== undefined && { fat }),
      ...(meals && {
        meals: {
          create: meals.map((m, i) => ({ ...m, order: m.order ?? i })),
        },
      }),
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  res.json({ success: true, data: diet });
}

/* ─── Trainer: delete a diet ────────────────────────────────────────────────── */
export async function deleteDiet(req: AuthRequest, res: Response) {
  const dietId = req.params.dietId as string;
  const existing = await prisma.diet.findFirst({
    where: { id: dietId, trainerId: req.user!.profileId },
  });
  if (!existing) {
    res.status(403).json({ success: false, error: "Dieta no encontrada o sin acceso" });
    return;
  }

  await prisma.diet.delete({ where: { id: dietId } });

  auditLog({
    action: "DIET_DELETED",
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    targetId: existing.id,
    meta: { clientId: existing.clientId, dietName: existing.name },
  });

  res.json({ success: true, data: null });
}

/* ─── Client: get their own diet ────────────────────────────────────────────── */
export async function getMyDiets(req: AuthRequest, res: Response) {
  const diets = await prisma.diet.findMany({
    where: { clientId: req.user!.profileId },
    orderBy: { createdAt: "desc" },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  res.json({ success: true, data: diets });
}
