import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";

const feedbackSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// POST /feedback/:routineId — client submits or updates feedback for a routine
export async function upsertFeedback(req: AuthRequest, res: Response) {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  // Verify routine belongs to this client
  const routine = await prisma.routine.findFirst({
    where: { id: req.params.routineId, client: { userId: req.user!.userId } },
    select: { id: true, clientId: true },
  });
  if (!routine) {
    res.status(404).json({ success: false, error: "Rutina no encontrada" });
    return;
  }

  const feedback = await prisma.weeklyFeedback.upsert({
    where:  { routineId: routine.id },
    create: { routineId: routine.id, clientId: routine.clientId, ...parsed.data },
    update: parsed.data,
  });

  res.json({ success: true, data: feedback });
}

// GET /feedback/routine/:routineId — trainer gets feedback for a routine
export async function getFeedbackByRoutine(req: AuthRequest, res: Response) {
  const feedback = await prisma.weeklyFeedback.findUnique({
    where: { routineId: req.params.routineId },
  });
  res.json({ success: true, data: feedback ?? null });
}
