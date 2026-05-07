import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/templates");
export const POST = proxyToBackend("POST", "/templates");
