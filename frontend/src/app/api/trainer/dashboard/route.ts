import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/trainer/dashboard");
