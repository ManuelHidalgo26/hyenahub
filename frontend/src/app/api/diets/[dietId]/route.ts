import { proxyToBackend } from "@/lib/backend-proxy";
export const PUT = proxyToBackend("PUT", (p) => `/diets/${p.dietId}`);
export const DELETE = proxyToBackend("DELETE", (p) => `/diets/${p.dietId}`);
