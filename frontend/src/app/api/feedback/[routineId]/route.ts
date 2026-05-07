import { proxyToBackend } from "@/lib/backend-proxy";
export const POST = proxyToBackend("POST", (p) => `/feedback/${p.routineId}`);
