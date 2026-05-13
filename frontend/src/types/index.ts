export type Role = "ADMIN" | "TRAINER" | "CLIENT";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  profileId: string;
}

export interface Client {
  id: string;
  userId: string;
  trainerId: string;
  goal: string;
  experience: string;
  equipment: string;
  weight?: number;
  age?: number;
  notes?: string;
  user: { id: string; name: string; email: string };
}

export interface Exercise {
  id: string;
  routineId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
  completedThisWeek: boolean;
  order: number;
}

export interface Routine {
  id: string;
  clientId: string;
  weekStart: string;
  createdAt: string;
  notes?: string;
  exercises: Exercise[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
