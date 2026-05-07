import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/profile/me");
export const PATCH = proxyToBackend("PATCH", "/profile/me");
