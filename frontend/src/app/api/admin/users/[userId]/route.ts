import { proxyToBackend } from "@/lib/backend-proxy";
export const DELETE = proxyToBackend("DELETE", (p) => `/admin/users/${p.userId}`);
