// Este módulo solo puede ejecutarse en el browser
if (typeof window === "undefined") {
  throw new Error("pdf.ts must only be imported on the client side");
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── Types ──────────────────────────────────────────────────────────────────── */
export interface ExercisePDF {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
  clientNote?: string | null;
  completed: boolean;
}
export interface RoutinePDF {
  weekStart: string;
  notes: string | null;
  exercises: ExercisePDF[];
}
export interface MealPDF {
  name: string;
  time: string | null;
  foods: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string | null;
}
export interface DietPDF {
  name: string;
  description: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  createdAt: string;
  meals: MealPDF[];
}

/* ─── Shared helpers ─────────────────────────────────────────────────────────── */
const ORANGE: [number, number, number] = [249, 115, 22];
const DARK:   [number, number, number] = [24, 24, 27];
const GRAY:   [number, number, number] = [113, 113, 122];
const LIGHT:  [number, number, number] = [250, 250, 250];

function addHeader(doc: jsPDF, subtitle: string) {
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("HyenaHub", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, 60, 14);
}

function addFooter(doc: jsPDF) {
  const h = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Generado por HyenaHub · ${new Date().toLocaleDateString("es-AR")}`,
    14,
    h - 10
  );
}

/* ─── Routine PDF ────────────────────────────────────────────────────────────── */
export function downloadRoutinePDF(routine: RoutinePDF, clientName?: string) {
  const doc = new jsPDF();
  addHeader(doc, "Plan de Entrenamiento");

  const start = new Date(routine.weekStart);
  const end   = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt   = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
  const weekRange = `${fmt(start)} – ${fmt(end)}`;

  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  let y = 34;
  if (clientName) { doc.text(`Cliente: ${clientName}`, 14, y); y += 7; }
  doc.text(`Semana: ${weekRange}`, 14, y); y += 7;

  if (routine.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRAY);
    doc.text(`Notas: ${routine.notes}`, 14, y);
    y += 6;
  }

  const done  = routine.exercises.filter(e => e.completed).length;
  const total = routine.exercises.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`Progreso: ${done} de ${total} ejercicios completados (${pct}%)`, 14, y);
  y += 8;

  const hasClientNotes = routine.exercises.some(e => e.clientNote);
  const head = [["#", "Ejercicio", "Series", "Reps", "Peso", "Notas del entrenador"]];
  if (hasClientNotes) head[0].push("Mi nota");

  const body = routine.exercises.map((ex, i) => {
    const row = [
      String(i + 1),
      ex.name,
      String(ex.sets),
      String(ex.reps),
      ex.weight ? `${ex.weight} kg` : "—",
      ex.notes || "—",
    ];
    if (hasClientNotes) row.push(ex.clientNote || "—");
    return row;
  });

  autoTable(doc, {
    head,
    body,
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 22, halign: "center" },
    },
  });

  addFooter(doc);
  doc.save(`rutina-${weekRange.replace(/[\s/]/g, "-")}.pdf`);
}

/* ─── Diet PDF ───────────────────────────────────────────────────────────────── */
export function downloadDietPDF(diet: DietPDF, clientName?: string) {
  const doc = new jsPDF();
  addHeader(doc, "Plan Nutricional");

  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  let y = 34;
  if (clientName) { doc.text(`Cliente: ${clientName}`, 14, y); y += 7; }
  doc.text(`Plan: ${diet.name}`, 14, y); y += 7;

  if (diet.description) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    const lines = doc.splitTextToSize(diet.description, 180) as string[];
    doc.text(lines, 14, y);
    y += lines.length * 5 + 3;
  }

  // Macro summary box
  const hasMacros = diet.calories || diet.protein || diet.carbs || diet.fat;
  if (hasMacros) {
    doc.setFillColor(255, 237, 213); // light orange bg
    doc.roundedRect(14, y, 182, 16, 2, 2, "F");
    doc.setTextColor(...ORANGE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const parts = [
      diet.calories ? `Calorias: ${diet.calories} kcal` : "",
      diet.protein  ? `Proteinas: ${diet.protein}g`     : "",
      diet.carbs    ? `Carbos: ${diet.carbs}g`           : "",
      diet.fat      ? `Grasas: ${diet.fat}g`             : "",
    ].filter(Boolean).join("   ·   ");
    doc.text(parts, 105, y + 10, { align: "center" });
    y += 24;
  } else {
    y += 4;
  }

  // Meals table
  const head = [["Comida", "Horario", "Alimentos", "Kcal", "P(g)", "C(g)", "G(g)"]];
  const body = diet.meals.map(m => [
    m.name,
    m.time ?? "—",
    m.foods,
    m.calories != null ? String(m.calories) : "—",
    m.protein  != null ? String(m.protein)  : "—",
    m.carbs    != null ? String(m.carbs)    : "—",
    m.fat      != null ? String(m.fat)      : "—",
  ]);

  autoTable(doc, {
    head,
    body,
    startY: y,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 72 },
      3: { cellWidth: 16, halign: "center" },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 16, halign: "center" },
      6: { cellWidth: 16, halign: "center" },
    },
  });

  addFooter(doc);
  doc.save(`dieta-${diet.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
