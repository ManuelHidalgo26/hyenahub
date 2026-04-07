"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import { ErrorBanner } from "@/components/ErrorBanner";

interface Meal {
  id: string; name: string; time: string | null; foods: string;
  calories: number | null; protein: number | null; carbs: number | null;
  fat: number | null; notes: string | null; order: number;
}
interface Diet {
  id: string; name: string; description: string | null;
  calories: number | null; protein: number | null;
  carbs: number | null; fat: number | null;
  createdAt: string; meals: Meal[];
}

const MEAL_ICONS: Record<string, string> = {
  Desayuno: "☀️", Almuerzo: "🍽️", Cena: "🌙",
  Colación: "🥜", Merienda: "☕", "Pre-entreno": "⚡", "Post-entreno": "💪",
};
function getMealIcon(name: string) {
  for (const [key, icon] of Object.entries(MEAL_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "🍴";
}

/* ─── Macro bar ──────────────────────────────────────────────────────────────── */
function MacroBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className={`font-semibold ${color}`}>{label}</span>
        <span className="text-zinc-400 tabular-nums">{value}g</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700`}
          style={{ width: `${pct}%`, background: color.includes("orange") ? "linear-gradient(90deg,#f97316,#fbbf24)"
            : color.includes("blue") ? "linear-gradient(90deg,#3b82f6,#06b6d4)"
            : color.includes("emerald") ? "linear-gradient(90deg,#10b981,#34d399)"
            : "linear-gradient(90deg,#a855f7,#ec4899)" }} />
      </div>
    </div>
  );
}

/* ─── Macro pill ─────────────────────────────────────────────────────────────── */
function MacroPill({ label, value, unit, color, bg }: {
  label: string; value: number; unit: string; color: string; bg: string;
}) {
  return (
    <div className={`${bg} border border-white/5 rounded-xl px-3 py-2.5 text-center`}>
      <p className={`text-lg font-black ${color} tabular-nums`}>{value}</p>
      <p className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5">{unit}</p>
      <p className="text-[10px] text-zinc-500 font-medium">{label}</p>
    </div>
  );
}

export default function ClientDietPage() {
  const { data: session } = useSession();
  const [diets,    setDiets]    = useState<Diet[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState("");
  const [tab,      setTab]      = useState(0);

  function load() {
    setLoading(true); setFetchErr("");
    api.get("/diets/my")
      .then(r => setDiets(r.data.data))
      .catch((e: Error) => setFetchErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (fetchErr) return <ErrorBanner message={fetchErr} onRetry={load} />;

  if (loading) return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-pulse">
      <div className="h-8 bg-zinc-800 rounded-full w-1/3 mb-2" />
      <div className="h-3 bg-zinc-800 rounded-full w-1/2 mb-8" />
      <div className="rounded-2xl bg-zinc-900 border border-white/[0.06] p-5 mb-4">
        <div className="flex gap-4 mb-4">
          {[1,2,3,4].map(i => <div key={i} className="h-10 flex-1 bg-zinc-800 rounded-xl" />)}
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="py-4 border-t border-white/[0.04] space-y-2">
            <div className="h-3 bg-zinc-800 rounded-full w-1/3" />
            <div className="h-2.5 bg-zinc-800 rounded-full w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );

  if (diets.length === 0) return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="animate-fade-in mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Mi dieta</h1>
        <p className="text-zinc-500 text-sm mt-1">Plan nutricional asignado por tu entrenador</p>
      </div>
      <div className="border border-dashed border-white/10 rounded-2xl p-14 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/15 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-orange-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 3v5M6 3v5M5 8v13M19 3v18M19 3c-1.5 0-2.5 2-2.5 4s1 2.5 2.5 2.5M16 12a4 4 0 11-8 0 4 4 0 018 0" />
          </svg>
        </div>
        <p className="text-white font-semibold text-sm">Todavía no tenés un plan de dieta</p>
        <p className="text-zinc-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
          Tu entrenador te asignará un plan nutricional personalizado con tus macros y comidas del día.
        </p>
        <div className="mt-6 flex items-center gap-2 justify-center text-xs text-zinc-600">
          <svg className="w-3.5 h-3.5 text-orange-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Te notificaremos cuando tu entrenador asigne contenido
        </div>
      </div>
    </div>
  );

  const diet = diets[tab];

  // Compute total macros from meals
  const totalCals    = diet.calories ?? diet.meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProtein = diet.protein  ?? diet.meals.reduce((s, m) => s + (m.protein  ?? 0), 0);
  const totalCarbs   = diet.carbs    ?? diet.meals.reduce((s, m) => s + (m.carbs    ?? 0), 0);
  const totalFat     = diet.fat      ?? diet.meals.reduce((s, m) => s + (m.fat      ?? 0), 0);

  const hasMacros = totalProtein > 0 || totalCarbs > 0 || totalFat > 0;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="animate-fade-in mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Mi dieta</h1>
          <p className="text-zinc-500 text-sm mt-1">Plan nutricional asignado por tu entrenador</p>
        </div>
        <button
          onClick={async () => { const { downloadDietPDF } = await import("@/lib/pdf"); downloadDietPDF(diet, session?.user?.name); }}
          title="Descargar como PDF"
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.06] text-zinc-500 hover:text-orange-400 hover:border-orange-500/20 hover:bg-orange-500/5 transition-all text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>

      {/* Diet selector tabs (if multiple diets) */}
      {diets.length > 1 && (
        <div className="flex gap-1 bg-zinc-900/50 border border-white/[0.05] rounded-xl p-1 w-fit mb-5 overflow-x-auto">
          {diets.map((d, i) => (
            <button key={d.id} onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                tab === i ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Diet summary card */}
      <div className="animate-slide-up bg-gradient-to-br from-zinc-900 via-orange-950/10 to-zinc-900 border border-orange-500/10 rounded-3xl p-5 sm:p-6 mb-5">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h2 className="text-lg font-black text-white">{diet.name}</h2>
            {diet.description && <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{diet.description}</p>}
          </div>
          {totalCals > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-2xl font-black text-orange-400 tabular-nums">{totalCals}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wide">kcal/día</p>
            </div>
          )}
        </div>

        {/* Macro summary pills */}
        {hasMacros && (
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <MacroPill label="Proteínas" value={totalProtein} unit="g"   color="text-orange-400"  bg="bg-orange-500/8" />
            <MacroPill label="Carbos"    value={totalCarbs}   unit="g"   color="text-blue-400"    bg="bg-blue-500/8" />
            <MacroPill label="Grasas"    value={totalFat}     unit="g"   color="text-emerald-400" bg="bg-emerald-500/8" />
          </div>
        )}

        {/* Macro bars */}
        {hasMacros && (
          <div className="space-y-3 mt-4 pt-4 border-t border-white/[0.04]">
            {totalProtein > 0 && <MacroBar label="Proteínas" value={totalProtein} total={totalProtein + totalCarbs + totalFat} color="text-orange-400" />}
            {totalCarbs   > 0 && <MacroBar label="Carbohidratos" value={totalCarbs} total={totalProtein + totalCarbs + totalFat} color="text-blue-400" />}
            {totalFat     > 0 && <MacroBar label="Grasas"    value={totalFat}     total={totalProtein + totalCarbs + totalFat} color="text-emerald-400" />}
          </div>
        )}
      </div>

      {/* Meals list */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: "100ms" }}>
        {diet.meals.map((meal, i) => {
          const mealCals    = meal.calories ?? 0;
          const mealProtein = meal.protein  ?? 0;
          const mealCarbs   = meal.carbs    ?? 0;
          const mealFat     = meal.fat      ?? 0;
          const hasMealMacros = mealProtein > 0 || mealCarbs > 0 || mealFat > 0;

          return (
            <div key={meal.id}
              className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}>

              {/* Meal header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{getMealIcon(meal.name)}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{meal.name}</p>
                    {meal.time && <p className="text-xs text-zinc-600">{meal.time}</p>}
                  </div>
                </div>
                {mealCals > 0 && (
                  <span className="text-sm font-bold text-orange-400 tabular-nums shrink-0">
                    {mealCals} kcal
                  </span>
                )}
              </div>

              {/* Foods */}
              <div className="px-4 sm:px-5 py-3.5">
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{meal.foods}</p>

                {/* Meal macros */}
                {hasMealMacros && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-white/[0.04]">
                    {mealProtein > 0 && (
                      <span className="text-xs font-medium text-orange-400/80 bg-orange-500/8 px-2 py-0.5 rounded-full">
                        P: {mealProtein}g
                      </span>
                    )}
                    {mealCarbs > 0 && (
                      <span className="text-xs font-medium text-blue-400/80 bg-blue-500/8 px-2 py-0.5 rounded-full">
                        C: {mealCarbs}g
                      </span>
                    )}
                    {mealFat > 0 && (
                      <span className="text-xs font-medium text-emerald-400/80 bg-emerald-500/8 px-2 py-0.5 rounded-full">
                        G: {mealFat}g
                      </span>
                    )}
                  </div>
                )}

                {meal.notes && (
                  <p className="mt-2.5 text-xs text-zinc-500 italic leading-relaxed">💡 {meal.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {diet.meals.length === 0 && (
        <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
          <p className="text-zinc-600 text-sm">Este plan todavía no tiene comidas cargadas.</p>
        </div>
      )}
    </div>
  );
}
