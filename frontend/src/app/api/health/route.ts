import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL ?? "NOT SET";
  try {
    const res = await fetch(`${backendUrl}/api/health`);
    const data = await res.json();
    return NextResponse.json({ ok: true, backend: backendUrl, ...data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, backend: backendUrl, error: msg }, { status: 500 });
  }
}
