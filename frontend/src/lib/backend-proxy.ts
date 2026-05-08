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

  // Auto-read body from request for non-GET methods if not explicitly provided
  let requestBody = body;
  if (requestBody === undefined && method !== "GET" && method !== "DELETE") {
    try {
      requestBody = await req.json();
    } catch {
      requestBody = undefined;
    }
  }

  const res = await fetch(`${BACKEND}/api/${path}`, {
    method,
    headers,
    body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
