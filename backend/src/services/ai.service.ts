import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ClientProfile {
  clientName: string;
  goal: string;
  experience: string; // beginner / intermediate / advanced
  equipment: string;  // none / home / gym / full
  weight?: number;
  age?: number;
  notes?: string;
}

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
  order: number;
}

export interface GeneratedRoutine {
  weeklyPlan: {
    day: string;
    exercises: GeneratedExercise[];
  }[];
  trainerNotes: string;
}

const EQUIPMENT_MAP: Record<string, string> = {
  none: "sin equipamiento (solo peso corporal)",
  home: "equipamiento de casa (mancuernas livianas, bandas elásticas)",
  gym: "equipamiento de gimnasio completo (barras, mancuernas, máquinas)",
  full: "equipamiento completo profesional",
};

const EXPERIENCE_MAP: Record<string, string> = {
  beginner: "principiante (menos de 6 meses de entrenamiento)",
  intermediate: "intermedio (6 meses a 2 años)",
  advanced: "avanzado (más de 2 años)",
};

export async function generateRoutine(client: ClientProfile): Promise<GeneratedRoutine> {
  const prompt = `Eres un entrenador personal experto. Genera una rutina de entrenamiento semanal personalizada.

PERFIL DEL CLIENTE:
- Nombre: ${client.clientName}
- Objetivo: ${client.goal}
- Nivel de experiencia: ${EXPERIENCE_MAP[client.experience] || client.experience}
- Equipamiento disponible: ${EQUIPMENT_MAP[client.equipment] || client.equipment}
${client.age ? `- Edad: ${client.age} años` : ""}
${client.weight ? `- Peso: ${client.weight} kg` : ""}
${client.notes ? `- Notas adicionales: ${client.notes}` : ""}

Devuelve SOLO un JSON válido con esta estructura exacta, sin texto adicional:
{
  "weeklyPlan": [
    {
      "day": "Lunes",
      "exercises": [
        {
          "name": "nombre del ejercicio",
          "sets": 3,
          "reps": 12,
          "weight": 20,
          "notes": "instrucción o tip opcional",
          "order": 0
        }
      ]
    }
  ],
  "trainerNotes": "notas generales sobre la rutina y recomendaciones"
}

Reglas:
- Incluir entre 3 y 5 días de entrenamiento según el nivel
- Entre 4 y 7 ejercicios por día
- Para principiantes: cargas ligeras, énfasis en técnica
- Para avanzados: variedad, progresión, supersets si aplica
- Si no hay equipamiento, usar solo peso corporal
- El campo "weight" es opcional (omitir si es ejercicio de peso corporal)
- Los días sin entrenamiento NO se incluyen en weeklyPlan`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Respuesta inesperada de la IA");
  }

  // Extract JSON from the response (handle potential markdown code blocks)
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No se pudo parsear la respuesta de la IA");
  }

  return JSON.parse(jsonMatch[0]) as GeneratedRoutine;
}
