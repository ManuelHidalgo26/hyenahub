import { proxyToBackend } from "@/lib/backend-proxy";
export const POST = proxyToBackend("POST", (p) => `/trainer/clients/${p.clientId}/reset-password`);
