import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const mealSchema = z.object({
  name:     z.string().min(1),
  time:     z.string().optional(),
  foods:    z.string().min(1),
  calories: z.number().int().optional(),
  protein:  z.number().int().optional(),
  carbs:    z.number().int().optional(),
  fat:      z.number().int().optional(),
  notes:    z.string().optional(),
});

const updateSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  calories:    z.number().int().optional(),
  protein:     z.number().int().optional(),
  carbs:       z.number().int().optional(),
  fat:         z.number().int().optional(),
  meals:       z.array(mealSchema).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const existing = await prisma.dietTemplate.findFirst({
    where: { id: params.templateId, trainerId: session.user.profileId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Plantilla no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { meals, ...templateData } = parsed.data;

  const template = await prisma.dietTemplate.update({
    where: { id: params.templateId },
    data: {
      ...templateData,
      ...(meals !== undefined && {
        meals: {
          deleteMany: {},
          create: meals,
        },
      }),
    },
    include: { meals: true },
  });

  return NextResponse.json({ success: true, data: template });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const existing = await prisma.dietTemplate.findFirst({
    where: { id: params.templateId, trainerId: session.user.profileId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Plantilla no encontrada" }, { status: 404 });
  }

  await prisma.dietTemplate.delete({ where: { id: params.templateId } });
  console.log(JSON.stringify({ action: "DIET_TEMPLATE_DELETED", actorId: session.user.id, targetId: params.templateId, ts: new Date() }));

  return NextResponse.json({ success: true });
}
