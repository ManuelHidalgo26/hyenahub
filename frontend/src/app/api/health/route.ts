import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "NOT SET";
  const host = dbUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@").split("?")[0];

  try {
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, host, userCount: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code ?? "unknown";
    return NextResponse.json({ ok: false, host, error: msg, code }, { status: 500 });
  }
}
