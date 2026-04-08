import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session)
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      ),
    };
  return { session, error: null };
}

export async function requireRole(role: "TRAINER" | "CLIENT" | "ADMIN") {
  const { session, error } = await requireAuth();
  if (error || !session) return { session: null, error: error! };
  if (session.user.role !== role)
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Acceso denegado" },
        { status: 403 }
      ),
    };
  return { session, error: null };
}
