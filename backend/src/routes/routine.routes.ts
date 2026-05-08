import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  createRoutine,
  patchRoutine,
  getRoutinesByClient,
  getMyRoutines,
  getCurrentRoutine,
  getMyProgress,
  toggleExercise,
  updateExerciseNote,
  deleteRoutine,
} from "../controllers/routine.controller";

const router = Router();

router.use(authenticate);

// Trainer routes
router.post("/",                         requireRole("TRAINER"), createRoutine);
router.patch("/:routineId",              requireRole("TRAINER"), patchRoutine);
router.get("/client/:clientId",          requireRole("TRAINER"), getRoutinesByClient);
router.delete("/:routineId",             requireRole("TRAINER"), deleteRoutine);

// Client routes
router.get("/my",                        requireRole("CLIENT"), getMyRoutines);
router.get("/my/current",                requireRole("CLIENT"), getCurrentRoutine);
router.get("/my/progress",               requireRole("CLIENT"), getMyProgress);
router.patch("/exercises/:exerciseId/complete", requireRole("CLIENT"), toggleExercise);
router.patch("/exercises/:exerciseId/note",     requireRole("CLIENT"), updateExerciseNote);

export default router;
