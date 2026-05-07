import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";
import { pusher } from "../services/pusher.service";
import { auditLog } from "../services/audit.service";

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
  dayId: z.string().optional(),
});

const daySchema = z.object({
  name: z.string().min(1),
  order: z.number().int().optional(),
  exercises: z.array(exerciseSchema).optional(),
});

const createRoutineSchema = z.object({
  clientId: z.string(),
  weekStart: z.string().datetime(),
  notes: z.string().optional(),
  durationWeeks: z.number().int().optional(),
  exercises: z.array(exerciseSchema).optional(),
  days: z.array(daySchema).optional(),
}).refine(d => (d.exercises?.length ?? 0) > 0 || (d.days?.length ?? 0) > 0, {
  message: "Must provide either exercises or days",
});

// POST /routines — trainer creates a routine for a client
export async function createRoutine(req: AuthRequest, res: Response) {
  const parsed = createRoutineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { clientId, weekStart, notes, durationWeeks, exercises, days } = parsed.data;

  // Verify the client belongs to this trainer
  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: req.user!.profileId },
  });

  if (!client) {
    res.status(403).json({ success: false, error: "Cliente no encontrado" });
    return;
  }

  // Create routine skeleton first
  const routine = await prisma.routine.create({
    data: {
      clientId,
      weekStart: new Date(weekStart),
      notes,
      durationWeeks: durationWeeks ?? 0,
    },
  });

  if (days?.length) {
    for (const [di, day] of days.entries()) {
      const createdDay = await prisma.routineDay.create({
        data: { routineId: routine.id, name: day.name, order: day.order ?? di },
      });
      if (day.exercises?.length) {
        await prisma.exercise.createMany({
          data: day.exercises.map((ex, ei) => ({
            routineId: routine.id,
            dayId: createdDay.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            notes: ex.notes,
            order: ex.order ?? ei,
          })),
        });
      }
    }
  } else if (exercises?.length) {
    await prisma.exercise.createMany({
      data: exercises.map((ex, i) => ({
        routineId: routine.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        notes: ex.notes,
        order: ex.order ?? i,
      })),
    });
  }

  const fullRoutine = await prisma.routine.findUnique({
    where: { id: routine.id },
    include: {
      days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
      exercises: { orderBy: { order: "asc" } },
    },
  });

  // Notify client in real time via Pusher
  pusher.trigger(`private-user-${client.userId}`, "routine.new", {
    routineId: routine.id,
    message: "Tu entrenador te asignó una nueva rutina 🏋️",
  }).catch(() => {});

  res.status(201).json({ success: true, data: fullRoutine });
}

// GET /routines/client/:clientId — list routines for a client (trainer view)
export async function getRoutinesByClient(req: AuthRequest, res: Response) {
  const clientId = req.params.clientId as string;
  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: req.user!.profileId },
  });

  if (!client) {
    res.status(403).json({ success: false, error: "Acceso denegado" });
    return;
  }

  const routines = await prisma.routine.findMany({
    where: { clientId },
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
  const exerciseId = req.params.exerciseId as string;
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
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

  // Notify trainer in real time via Pusher
  const trainerChannel = `private-user-${exercise.routine.client.trainerId}`;
  pusher.trigger(trainerChannel, "exercise.completed", {
    exerciseId: updated.id,
    exerciseName: updated.name,
    routineId: exercise.routineId,
    clientId: exercise.routine.clientId,
    completed: updated.completed,
  }).catch(() => {});

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

    pusher.trigger(trainerChannel, "session.completed", {
      clientId: exercise.routine.clientId,
      clientName: client?.user.name,
      routineId: exercise.routineId,
      message: `${client?.user.name} completó su sesión de hoy 💪`,
    }).catch(() => {});
  }

  res.json({ success: true, data: updated });
}

// PATCH /routines/exercises/:exerciseId/note — client adds/edits personal note
export async function updateExerciseNote(req: AuthRequest, res: Response) {
  const note: string | null = req.body.note ?? null;
  const exerciseId = req.params.exerciseId as string;

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
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
  const routineId = req.params.routineId as string;
  const routine = await prisma.routine.findFirst({
    where: {
      id: routineId,
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
