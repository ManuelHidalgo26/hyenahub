import { proxyToBackend } from "@/lib/backend-proxy";
export const PATCH = proxyToBackend("PATCH", (p) => `/diet-templates/${p.templateId}`);
export const DELETE = proxyToBackend("DELETE", (p) => `/diet-templates/${p.templateId}`);
