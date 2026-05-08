import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET() {
  const res = await fetch(`${BACKEND}/api/auth/trainers`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
