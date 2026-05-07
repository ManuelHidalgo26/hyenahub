import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/videos");
export const POST = proxyToBackend("POST", "/videos");
