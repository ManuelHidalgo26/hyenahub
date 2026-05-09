import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name:      z.string().min(2).max(100),
  email:     z.string().email().max(255),
  password:  z.string().min(6),
  role:      z.enum(["TRAINER", "CLIENT"]),
  trainerId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const result = RegisterSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  return proxyToBackend(req, "auth/register", "POST", result.data, false);
}
