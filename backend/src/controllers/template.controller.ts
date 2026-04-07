import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";
import { auditLog } from "../services/audit.service";

const exerciseSchema = z.object({
  name:  z.string().min(1),
  sets:  z.number().int().positive(),
  reps:  z.number().int().positive(),
  weight: z.number().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
});

const createSchema = z.object({
  name:        z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  exercises:   z.array(exerciseSchema).min(1),
});

// GET /templates — trainer's own templates
export async function getMyTemplates(req: AuthRequest, res: Response) {
  const templates = await prisma.routineTemplate.findMany({
    where: { trainerId: req.user!.profileId },
    orderBy: { createdAt: "desc" },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  res.json({ success: true, data: templates });
}

// POST /templates — create template
export async function createTemplate(req: AuthRequest, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const { name, description, exercises } = parsed.data;
  const template = await prisma.routineTemplate.create({
    data: {
      trainerId: req.user!.profileId,
      name, description,
      exercises: { create: exercises.map((ex, i) => ({ ...ex, order: ex.order ?? i })) },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  res.status(201).json({ success: true, data: template });
}

// DELETE /templates/:templateId — delete template
export async function deleteTemplate(req: AuthRequest, res: Response) {
  const tmpl = await prisma.routineTemplate.findFirst({
    where: { id: req.params.templateId, trainerId: req.user!.profileId },
  });
  if (!tmpl) {
    res.status(404).json({ success: false, error: "Template no encontrado" });
    return;
  }
  await prisma.routineTemplate.delete({ where: { id: tmpl.id } });

  auditLog({
    action: "ROUTINE_DELETED",
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    targetId: tmpl.id,
    meta: { name: tmpl.name, type: "template" },
  });

  res.json({ success: true, message: "Template eliminado" });
}
