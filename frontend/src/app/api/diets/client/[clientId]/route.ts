import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", (p) => `/diets/client/${p.clientId}`);
