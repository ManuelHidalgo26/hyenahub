import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const trainers = await prisma.trainer.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const data = trainers.map(t => ({
    id:        t.id,
    name:      t.user.name,
    email:     t.user.email,
    avatar:    t.user.avatar,
    specialty: t.specialty,
    bio:       t.bio,
  }));

  return NextResponse.json({ success: true, data });
}
