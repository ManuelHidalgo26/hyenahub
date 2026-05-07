import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", (p) => `/messages/${p.otherUserId}`);
export const POST = proxyToBackend("POST", (p) => `/messages/${p.otherUserId}`);
