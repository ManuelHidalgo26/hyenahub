import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";
import { auditLog } from "../services/audit.service";

const createSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  videoUrl:    z.string().url(),
  exercise:    z.string().optional(),
});

// GET /videos — trainer's own videos
export async function getMyVideos(req: AuthRequest, res: Response) {
  const videos = await prisma.trainerVideo.findMany({
    where: { trainerId: req.user!.profileId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: videos });
}

// GET /videos/trainer/:trainerId — client views their trainer's videos
export async function getVideosByTrainer(req: AuthRequest, res: Response) {
  const videos = await prisma.trainerVideo.findMany({
    where: { trainerId: req.params.trainerId as string },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: videos });
}

// POST /videos — trainer creates a video
export async function createVideo(req: AuthRequest, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const video = await prisma.trainerVideo.create({
    data: { ...parsed.data, trainerId: req.user!.profileId },
  });
  res.status(201).json({ success: true, data: video });
}

// DELETE /videos/:videoId — trainer deletes a video
export async function deleteVideo(req: AuthRequest, res: Response) {
  const video = await prisma.trainerVideo.findFirst({
    where: { id: req.params.videoId as string, trainerId: req.user!.profileId },
  });
  if (!video) {
    res.status(404).json({ success: false, error: "Video no encontrado" });
    return;
  }
  await prisma.trainerVideo.delete({ where: { id: video.id } });

  auditLog({
    action: "VIDEO_DELETED",
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    targetId: video.id,
    meta: { title: video.title },
  });

  res.json({ success: true, message: "Video eliminado" });
}
