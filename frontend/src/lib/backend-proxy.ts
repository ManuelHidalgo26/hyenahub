import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL!;

type ParamGetter = (params: Record<string, string>) => string;

export function proxyToBackend(method: string, pathOrFn: string | ParamGetter) {
  return async (
    req: NextRequest,
    ctx?: { params: Promise<Record<string, string>> }
  ) => {
    const session = await getServerSession(authOptions);
    const params = ctx?.params ? await ctx.params : {};
    const path = typeof pathOrFn === "function" ? pathOrFn(params) : pathOrFn;
    const url = `${BACKEND}/api${path}${req.nextUrl.search}`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(session?.user?.backendToken
          ? { Authorization: `Bearer ${session.user.backendToken}` }
          : {}),
      },
      body: ["POST", "PUT", "PATCH"].includes(method)
        ? await req.text()
        : undefined,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  };
}
