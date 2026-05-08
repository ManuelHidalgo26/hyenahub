import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";
import { emitToUser } from "../socket";
import { auditLog } from "../services/audit.service";

const exerciseSchema = z.object({
  name:   z.string().min(1),
  sets:   z.number().int().positive(),
  reps:   z.number().int().positive(),
  weight: z.number().optional(),
  notes:  z.string().optional(),
  order:  z.number().int().optional(),
});

const daySchema = z.object({
  name:      z.string().min(1),
  order:     z.number().int().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

const createRoutineSchema = z.object({
  clientId:      z.string(),
  weekStart:     z.string().datetime(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  notes:         z.string().optional(),
  exercises:     z.array(exerciseSchema).optional(),
  days:          z.array(daySchema).optional(),
}).refine(d => (d.exercises && d.exercises.length > 0) || (d.days && d.days.length > 0), {
  message: "Se requiere exercises o days",
});

const patchRoutineSchema = z.object({
  weekStart:     z.string().datetime().optional(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  notes:         z.string().optional(),
  exercises:     z.array(exerciseSchema).optional(),
  days:          z.array(daySchema).optional(),
});

type ExInput = { name: string; sets: number; reps: number; weight?: number; notes?: string; order: number };

function flattenDays(days: z.infer<typeof daySchema>[]): ExInput[] {
  let globalOrder = 0;
  return days.flatMap(day =>
    day.exercises.map(ex => ({
      name:   ex.name,
      sets:   ex.sets,
      reps:   ex.reps,
      weight: ex.weight,
      notes:  ex.notes,
      order:  globalOrder++,
    }))
  );
}

export async function createRoutine(req: AuthRequest, res: Response) {
  const parsed = createRoutineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { clientId, weekStart, durationWeeks, notes, exercises, days } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: req.user!.profileId },
  });

  if (!client) {
    res.status(403).json({ success: false, error: "Cliente no encontrado" });
    return;
  }

  const flatExercises: ExInput[] = days && days.length > 0
    ? flattenDays(days)
    : (exercises ?? []).map((ex, i) => ({ ...ex, order: ex.order ?? i }));

  const routine = await prisma.routine.create({
    data: {
      clientId,
      weekStart:     new Date(weekStart),
      durationWeeks: durationWeeks ?? 0,
      notes,
      exercises: { create: flatExercises },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  emitToUser(client.userId, "routine:new", {
    routineId: routine.id,
    message:   "Tu entrenador te asignó una nueva rutina 🏋️",
  });

  res.status(201).json({ success: true, data: routine });
}

export async function patchRoutine(req: AuthRequest, res: Response) {
  const parsed = patchRoutineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const routine = await prisma.routine.findFirst({
    where: { id: req.params.routineId, client: { trainerId: req.user!.profileId } },
  });

  if (!routine) {
    res.status(404).json({ success: false, error: "Rutina no encontrada" });
    return;
  }

  const { weekStart, durationWeeks, notes, exercises, days } = parsed.data;

  let flatExercises: ExInput[] | null = null;
  if (days && days.length > 0) {
    flatExercises = flattenDays(days);
  } else if (exercises && exercises.length > 0) {
    flatExercises = exercises.map((ex, i) => ({ ...ex, order: ex.order ?? i }));
  }

  if (flatExercises) {
    await prisma.exercise.deleteMany({ where: { routineId: routine.id } });
  }

  const updated = await prisma.routine.update({
    where: { id: routine.id },
    data: {
      ...(weekStart     !== undefined && { weekStart: new Date(weekStart) }),
      ...(durationWeeks !== undefined && { durationWeeks }),
      ...(notes         !== undefined && { notes }),
      ...(flatExercises && { exercises: { create: flatExercises } }),
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  res.json({ success: true, data: updated });
}

export async function getRoutinesByClient(req: AuthRequest, res: Response) {
  const client = await prisma.client.findFirst({
    where: { id: req.params.clientId, trainerId: req.user!.profileId },
  });

  if (!client) {
    res.status(403).json({ success: false, error: "Acceso denegado" });
    return;
  }

  const routines = await prisma.routine.findMany({
    where:   { clientId: req.params.clientId },
    orderBy: { weekStart: "desc" },
    include: { exercises: { orderBy: { order: "asc" } }, feedback: true },
  });

  res.json({ success: true, data: routines });
}

export async function getMyRoutines(req: AuthRequest, res: Response) {
  const routines = await prisma.routine.findMany({
    where:   { clientId: req.user!.profileId },
    orderBy: { weekStart: "desc" },
    include: {
      exercises: { orderBy: { order: "asc" } },
      client:    { select: { trainerId: true } },
      feedback:  true,
    },
  });

  res.json({ success: true, data: routines });
}

export async function getCurrentRoutine(req: AuthRequest, res: Response) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const routine = await prisma.routine.findFirst({
    where: {
      clientId:  req.user!.profileId,
      weekStart: { gte: weekStart },
    },
    orderBy: { weekStart: "desc" },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  res.json({ success: true, data: routine ?? null });
}

export async function toggleExercise(req: AuthRequest, res: Response) {
  const exercise = await prisma.exercise.findUnique({
    where:   { id: req.params.exerciseId },
    include: { routine: { include: { client: true } } },
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
    data:  { completed: !exercise.completed },
  });

  emitToUser(exercise.routine.client.trainerId, "exercise:completed", {
    exerciseId:   updated.id,
    exerciseName: updated.name,
    routineId:    exercise.routineId,
    clientId:     exercise.routine.clientId,
    completed:    updated.completed,
  });

  const allExercises = await prisma.exercise.findMany({
    where: { routineId: exercise.routineId },
  });

  const sessionComplete = allExercises.every(ex =>
    ex.id === updated.id ? updated.completed : ex.completed
  );

  if (sessionComplete) {
    const client = await prisma.client.findUnique({
      where:   { id: exercise.routine.clientId },
      include: { user: { select: { name: true } } },
    });
    emitToUser(exercise.routine.client.trainerId, "session:completed", {
      clientId:   exercise.routine.clientId,
      clientName: client?.user.name,
      routineId:  exercise.routineId,
      message:    `${client?.user.name} completó su sesión de hoy 💪`,
    });
  }

  res.json({ success: true, data: updated });
}

export async function updateExerciseNote(req: AuthRequest, res: Response) {
  const note: string | null = req.body.note ?? null;

  const exercise = await prisma.exercise.findUnique({
    where:   { id: req.params.exerciseId },
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
    data:  { clientNote: note || null },
  });

  res.json({ success: true, data: updated });
}

export async function getMyProgress(req: AuthRequest, res: Response) {
  const routines = await prisma.routine.findMany({
    where:   { clientId: req.user!.profileId },
    orderBy: { weekStart: "asc" },
    take:    12,
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

export async function deleteRoutine(req: AuthRequest, res: Response) {
  const routine = await prisma.routine.findFirst({
    where: { id: req.params.routineId, client: { trainerId: req.user!.profileId } },
  });

  if (!routine) {
    res.status(404).json({ success: false, error: "Rutina no encontrada" });
    return;
  }

  await prisma.routine.delete({ where: { id: routine.id } });

  auditLog({
    action:    "ROUTINE_DELETED",
    actorId:   req.user!.userId,
    actorRole: req.user!.role,
    targetId:  routine.id,
    meta:      { clientId: routine.clientId, weekStart: routine.weekStart },
  });

  res.json({ success: true, message: "Rutina eliminada" });
}
