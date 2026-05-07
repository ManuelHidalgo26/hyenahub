import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", "/profile/my-trainer");
