import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "NOT SET";
  const host = dbUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@").split("?")[0];
  // Extract just the username to verify it has the project ref (postgres.PROJECT_REF)
  const usernameMatch = dbUrl.match(/\/\/([^:]+):/);
  const username = usernameMatch ? usernameMatch[1] : "unknown";

  try {
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, host, username, userCount: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code ?? "unknown";
    return NextResponse.json({ ok: false, host, username, error: msg, code }, { status: 500 });
  }
}
