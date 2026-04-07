import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { generateRoutine } from "../services/ai.service";
import { AuthRequest } from "../types";
import { prisma } from "../services/prisma.service";
import { Response } from "express";

const router = Router();

router.use(authenticate, requireRole("TRAINER"));

// POST /ai/generate-routine — generate a routine for a client using Claude
router.post("/generate-routine", async (req: AuthRequest, res: Response) => {
  const { clientId } = req.body;

  if (!clientId) {
    res.status(400).json({ success: false, error: "clientId requerido" });
    return;
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: req.user!.profileId },
    include: { user: { select: { name: true } } },
  });

  if (!client) {
    res.status(404).json({ success: false, error: "Cliente no encontrado" });
    return;
  }

  const routine = await generateRoutine({
    clientName: client.user.name,
    goal: client.goal,
    experience: client.experience,
    equipment: client.equipment,
    weight: client.weight ?? undefined,
    age: client.age ?? undefined,
    notes: client.notes ?? undefined,
  });

  res.json({ success: true, data: routine });
});

export default router;
