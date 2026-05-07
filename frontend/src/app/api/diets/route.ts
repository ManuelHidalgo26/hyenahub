import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/diets");
export const POST = proxyToBackend("POST", "/diets");
