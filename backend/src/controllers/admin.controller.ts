import { Response } from "express";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";
import { auditLog } from "../services/audit.service";

// GET /admin/trainers
export async function getTrainers(req: AuthRequest, res: Response) {
  const trainers = await prisma.trainer.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      _count: { select: { clients: true } },
    },
  });

  res.json({ success: true, data: trainers });
}

// GET /admin/stats
export async function getStats(req: AuthRequest, res: Response) {
  const [totalUsers, totalTrainers, totalClients, totalRoutines, completedExercises] =
    await Promise.all([
      prisma.user.count(),
      prisma.trainer.count(),
      prisma.client.count(),
      prisma.routine.count(),
      prisma.exercise.count({ where: { completed: true } }),
    ]);

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const newUsersLast30 = await prisma.user.count({
    where: { createdAt: { gte: last30Days } },
  });

  res.json({
    success: true,
    data: {
      totalUsers,
      totalTrainers,
      totalClients,
      totalRoutines,
      completedExercises,
      newUsersLast30,
    },
  });
}

// GET /admin/users — full user list with roles
export async function getAllUsers(req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: users });
}

// DELETE /admin/users/:userId — soft ban (just an example)
export async function deleteUser(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId as string } });

  if (!user) {
    res.status(404).json({ success: false, error: "Usuario no encontrado" });
    return;
  }

  await prisma.user.delete({ where: { id: user.id } });

  auditLog({
    action: "USER_DELETED",
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    targetId: user.id,
    meta: { deletedEmail: user.email, deletedRole: user.role },
  });

  res.json({ success: true, message: "Usuario eliminado" });
}
