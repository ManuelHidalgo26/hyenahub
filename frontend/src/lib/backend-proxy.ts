import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function proxyToBackend(
  req: NextRequest,
  path: string,
  method: Method = "GET",
  body?: unknown,
  requireAuth = true
): Promise<NextResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const session = await getServerSession(authOptions);
    if (!session?.backendToken) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    headers["Authorization"] = `Bearer ${session.backendToken}`;
  }

  const url = `${BACKEND}/api/${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
