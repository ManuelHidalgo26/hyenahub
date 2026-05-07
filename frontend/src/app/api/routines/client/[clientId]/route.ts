import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", (p) => `/routines/client/${p.clientId}`);
