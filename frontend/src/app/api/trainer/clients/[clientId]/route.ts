import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", (p) => `/trainer/clients/${p.clientId}`);
export const PATCH = proxyToBackend("PATCH", (p) => `/trainer/clients/${p.clientId}`);
