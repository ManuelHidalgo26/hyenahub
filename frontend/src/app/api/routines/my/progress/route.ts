import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/routines/my/progress");
