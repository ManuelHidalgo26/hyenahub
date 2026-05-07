import { proxyToBackend } from "@/lib/backend-proxy";
export const PATCH = proxyToBackend("PATCH", (p) => `/routines/exercises/${p.exerciseId}/complete`);
