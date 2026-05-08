import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// diet-templates endpoint not yet implemented in backend
export async function GET() {
  return NextResponse.json({ success: true, data: [] });
}

export async function POST() {
  return NextResponse.json({ success: false, error: "No implementado" }, { status: 501 });
}
