import { Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";

// GET /trainer/clients — list all clients for the authenticated trainer
export async function getClients(req: AuthRequest, res: Response) {
  const clients = await prisma.client.findMany({
    where: { trainerId: req.user!.profileId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      routines: {
        orderBy: { weekStart: "desc" },
        take: 1,
        include: {
          exercises: { select: { id: true, completed: true } },
        },
      },
    },
  });

  res.json({ success: true, data: clients });
}

// GET /trainer/clients/:clientId — client detail
export async function getClientById(req: AuthRequest, res: Response) {
  const client = await prisma.client.findFirst({
    where: {
      id: req.params.clientId,
      trainerId: req.user!.profileId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      routines: {
        orderBy: { weekStart: "desc" },
        include: { exercises: true },
      },
    },
  });

  if (!client) {
    res.status(404).json({ success: false, error: "Cliente no encontrado" });
    return;
  }

  res.json({ success: true, data: client });
}

const updateClientSchema = z.object({
  goal: z.string().optional(),
  experience: z.string().optional(),
  equipment: z.string().optional(),
  weight: z.number().optional(),
  age: z.number().int().optional(),
  notes: z.string().optional(),
});

// PATCH /trainer/clients/:clientId — update client profile
export async function updateClient(req: AuthRequest, res: Response) {
  const parsed = updateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const client = await prisma.client.findFirst({
    where: { id: req.params.clientId, trainerId: req.user!.profileId },
  });

  if (!client) {
    res.status(404).json({ success: false, error: "Cliente no encontrado" });
    return;
  }

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: parsed.data,
  });

  res.json({ success: true, data: updated });
}

// GET /trainer/dashboard — aggregate stats
export async function getDashboard(req: AuthRequest, res: Response) {
  const trainerId = req.user!.profileId;

  const [totalClients, weekStart] = [
    await prisma.client.count({ where: { trainerId } }),
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    })(),
  ];

  const thisWeekRoutines = await prisma.routine.count({
    where: {
      weekStart: { gte: weekStart },
      client: { trainerId },
    },
  });

  const completedExercisesThisWeek = await prisma.exercise.count({
    where: {
      completed: true,
      routine: {
        weekStart: { gte: weekStart },
        client: { trainerId },
      },
    },
  });

  res.json({
    success: true,
    data: { totalClients, thisWeekRoutines, completedExercisesThisWeek },
  });
}

// POST /trainer/clients/:clientId/reset-password
export async function resetClientPassword(req: AuthRequest, res: Response) {
  const client = await prisma.client.findFirst({
    where: { id: req.params.clientId, trainerId: req.user!.profileId },
    include: { user: { select: { id: true } } },
  });

  if (!client) {
    res.status(403).json({ success: false, error: "Cliente no encontrado o sin acceso" });
    return;
  }

  const words = ["Entreno", "Fuerza", "Rutina", "Gym", "Salud", "Fit", "Sport", "Power"];
  const word = words[Math.floor(Math.random() * words.length)];
  const nums = String(Math.floor(1000 + Math.random() * 9000));
  const tempPassword = `${word}${nums}`;

  const hashed = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({
    where: { id: client.user.id },
    data: { password: hashed },
  });

  res.json({ success: true, data: { tempPassword } });
}
