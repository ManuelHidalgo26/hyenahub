import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/routines");
export const POST = proxyToBackend("POST", "/routines");
