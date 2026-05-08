import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH() {
  return NextResponse.json({ success: false, error: "No implementado" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: "No implementado" }, { status: 501 });
}
