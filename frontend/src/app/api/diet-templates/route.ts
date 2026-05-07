import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/diet-templates");
export const POST = proxyToBackend("POST", "/diet-templates");
