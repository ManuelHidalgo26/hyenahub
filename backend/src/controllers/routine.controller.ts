import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";
import { emitToUser } from "../socket";
import { auditLog } from "../services/audit.service";

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
});

const createRoutineSchema = z.object({
  clientId: z.string(),
  weekStart: z.string().datetime(),
  notes: z.string().optional(),
  durationWeeks: z.number().int().positive().nullable().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

// POST /routines — trainer creates a routine for a client
export async function createRoutine(req: AuthRequest, res: Response) {
  const parsed = createRoutineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { clientId, weekStart, notes, durationWeeks, exercises } = parsed.data;

  // Verify the client belongs to this trainer
  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: req.user!.profileId },
  });

  if (!client) {
    res.status(403).json({ success: false, error: "Cliente no encontrado" });
    return;
  }

  const routine = await prisma.routine.create({
    data: {
      clientId,
      weekStart: new Date(weekStart),
      notes,
      durationWeeks,
      exercises: {
        create: exercises.map((ex, i) => ({ ...ex, order: ex.order ?? i })),
      },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  // Notify client in real time
  emitToUser(client.userId, "routine:new", {
    routineId: routine.id,
    message: "Tu entrenador te asignó una nueva rutina 🏋️",
  });

  res.status(201).json({ success: true, data: routine });
}

// GET /routines/client/:clientId — list routines for a client (trainer view)
export async function getRoutinesByClient(req: AuthRequest, res: Response) {
  const client = await prisma.client.findFirst({
    where: { id: req.params.clientId, trainerId: req.user!.profileId },
  });

  if (!client) {
    res.status(403).json({ success: false, error: "Acceso denegado" });
    return;
  }

  const routines = await prisma.routine.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { weekStart: "desc" },
    include: {
      exercises: { orderBy: { order: "asc" } },
      feedback: true,
    },
  });

  res.json({ success: true, data: routines });
}

// GET /routines/my — client sees their own routines (includes trainerId for socket)
export async function getMyRoutines(req: AuthRequest, res: Response) {
  const routines = await prisma.routine.findMany({
    where: { clientId: req.user!.profileId },
    orderBy: { weekStart: "desc" },
    include: {
      exercises: { orderBy: { order: "asc" } },
      client: { select: { trainerId: true } },
      feedback: true,
    },
  });

  res.json({ success: true, data: routines });
}

// GET /routines/my/current — current week routine for client
export async function getCurrentRoutine(req: AuthRequest, res: Response) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const routine = await prisma.routine.findFirst({
    where: {
      clientId: req.user!.profileId,
      weekStart: { gte: weekStart },
    },
    orderBy: { weekStart: "desc" },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  res.json({ success: true, data: routine ?? null });
}

// PATCH /routines/exercises/:exerciseId/complete — client marks exercise done
export async function toggleExercise(req: AuthRequest, res: Response) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: req.params.exerciseId },
    include: {
      routine: {
        include: { client: true },
      },
    },
  });

  if (!exercise) {
    res.status(404).json({ success: false, error: "Ejercicio no encontrado" });
    return;
  }

  // Verify this exercise belongs to the requesting client
  if (exercise.routine.clientId !== req.user!.profileId) {
    res.status(403).json({ success: false, error: "Acceso denegado" });
    return;
  }

  const updated = await prisma.exercise.update({
    where: { id: exercise.id },
    data: { completed: !exercise.completed },
  });

  // Notify trainer in real time
  emitToUser(exercise.routine.client.trainerId, "exercise:completed", {
    exerciseId: updated.id,
    exerciseName: updated.name,
    routineId: exercise.routineId,
    clientId: exercise.routine.clientId,
    completed: updated.completed,
  });

  // Check if all exercises in routine are completed
  const allExercises = await prisma.exercise.findMany({
    where: { routineId: exercise.routineId },
  });

  const sessionComplete = allExercises.every((ex) =>
    ex.id === updated.id ? updated.completed : ex.completed
  );

  if (sessionComplete) {
    const client = await prisma.client.findUnique({
      where: { id: exercise.routine.clientId },
      include: { user: { select: { name: true } } },
    });

    emitToUser(exercise.routine.client.trainerId, "session:completed", {
      clientId: exercise.routine.clientId,
      clientName: client?.user.name,
      routineId: exercise.routineId,
      message: `${client?.user.name} completó su sesión de hoy 💪`,
    });
  }

  res.json({ success: true, data: updated });
}

// PATCH /routines/exercises/:exerciseId/note — client adds/edits personal note
export async function updateExerciseNote(req: AuthRequest, res: Response) {
  const note: string | null = req.body.note ?? null;

  const exercise = await prisma.exercise.findUnique({
    where: { id: req.params.exerciseId },
    include: { routine: true },
  });

  if (!exercise) {
    res.status(404).json({ success: false, error: "Ejercicio no encontrado" });
    return;
  }

  if (exercise.routine.clientId !== req.user!.profileId) {
    res.status(403).json({ success: false, error: "Acceso denegado" });
    return;
  }

  const updated = await prisma.exercise.update({
    where: { id: exercise.id },
    data: { clientNote: note || null },
  });

  res.json({ success: true, data: updated });
}

// GET /routines/my/progress — last N weeks stats for the client
export async function getMyProgress(req: AuthRequest, res: Response) {
  const routines = await prisma.routine.findMany({
    where: { clientId: req.user!.profileId },
    orderBy: { weekStart: "asc" },
    take: 12,
    include: { exercises: { select: { completed: true } } },
  });

  const data = routines.map(r => {
    const total = r.exercises.length;
    const done  = r.exercises.filter(e => e.completed).length;
    return {
      weekStart: r.weekStart.toISOString().split("T")[0],
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  res.json({ success: true, data });
}

// DELETE /routines/:routineId — trainer deletes a routine
export async function deleteRoutine(req: AuthRequest, res: Response) {
  const routine = await prisma.routine.findFirst({
    where: {
      id: req.params.routineId,
      client: { trainerId: req.user!.profileId },
    },
  });

  if (!routine) {
    res.status(404).json({ success: false, error: "Rutina no encontrada" });
    return;
  }

  await prisma.routine.delete({ where: { id: routine.id } });

  auditLog({
    action: "ROUTINE_DELETED",
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    targetId: routine.id,
    meta: { clientId: routine.clientId, weekStart: routine.weekStart },
  });

  res.json({ success: true, message: "Rutina eliminada" });
}
