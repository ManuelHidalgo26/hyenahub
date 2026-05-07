import { proxyToBackend } from "@/lib/backend-proxy";
export const POST = proxyToBackend("POST", "/ai/generate-routine");
