import { proxyToBackend } from "@/lib/backend-proxy";
export const PATCH = proxyToBackend("PATCH", (p) => `/templates/${p.templateId}`);
export const DELETE = proxyToBackend("DELETE", (p) => `/templates/${p.templateId}`);
