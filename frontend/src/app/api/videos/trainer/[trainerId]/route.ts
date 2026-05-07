import { proxyToBackend } from "@/lib/backend-proxy";
export const GET = proxyToBackend("GET", (p) => `/videos/trainer/${p.trainerId}`);
