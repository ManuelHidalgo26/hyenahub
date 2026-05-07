import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", (p) => `/feedback/routine/${p.routineId}`);
