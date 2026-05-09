import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const generateSchema = z.object({
  clientName:   z.string().optional(),
  goal:         z.string().min(1),
  level:        z.enum(["beginner", "intermediate", "advanced"]),
  daysPerWeek:  z.number().int().min(1).max(7),
  equipment:    z.string().optional(),
  restrictions: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { clientName, goal, level, daysPerWeek, equipment, restrictions } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "API key no configurada" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Genera una rutina de entrenamiento semanal en formato JSON con esta estructura exacta:
{
  "name": "nombre de la rutina",
  "description": "descripción breve",
  "durationWeeks": número entre 4-12,
  "days": [
    {
      "name": "nombre del día (ej: Día 1 - Pecho y Tríceps)",
      "order": número comenzando desde 0,
      "exercises": [
        {
          "name": "nombre del ejercicio",
          "sets": número,
          "reps": número,
          "weight": número en kg o null,
          "notes": "notas opcionales",
          "order": número comenzando desde 0
        }
      ]
    }
  ]
}

Parámetros:
- Cliente: ${clientName ?? "no especificado"}
- Objetivo: ${goal}
- Nivel: ${level}
- Días por semana: ${daysPerWeek}
- Equipamiento: ${equipment ?? "gimnasio completo"}
- Restricciones: ${restrictions ?? "ninguna"}

Responde SOLO con el JSON válido, sin texto adicional.`;

  const message = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  let routine;
  try {
    routine = JSON.parse(text.trim());
  } catch {
    return NextResponse.json({ success: false, error: "Error al parsear la respuesta de IA" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: routine });
}
