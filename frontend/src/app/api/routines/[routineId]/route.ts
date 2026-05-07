import { proxyToBackend } from "@/lib/backend-proxy";
export const PATCH = proxyToBackend("PATCH", (p) => `/routines/${p.routineId}`);
export const DELETE = proxyToBackend("DELETE", (p) => `/routines/${p.routineId}`);
