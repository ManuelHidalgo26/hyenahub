import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Avatar updates are handled by PATCH /api/profile
export { PATCH } from "@/app/api/profile/route";

// Keep file to avoid 404 on existing clients calling /api/profile/avatar
export async function GET(req: NextRequest) {
  return new Response(null, { status: 405 });
}
