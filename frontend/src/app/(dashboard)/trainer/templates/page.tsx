"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface ExForm { name: string; sets: string; reps: string; weight: string; notes: string; }
const EMPTY_EX: ExForm = { name: "", sets: "3", reps: "10", weight: "", notes: "" };

interface MealForm { name: string; time: string; foods: string; calories: string; protein: string; carbs: string; fat: string; notes: string; }
const EMPTY_MEAL: MealForm = { name: "", time: "", foods: "", calories: "", protein: "", carbs: "", fat: "", notes: "" };

interface RoutineTemplateEx { id: string; name: string; sets: number; reps: number; weight: number | null; notes: string | null; order: number; }
interface RoutineTemplate { id: string; name: string; description: string | null; createdAt: string; exercises: RoutineTemplateEx[]; }

interface DietTemplateMeal { id: string; name: string; time: string | null; foods: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; notes: string | null; order: number; }
interface DietTemplate { id: string; name: string; description: string | null; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; createdAt: string; meals: DietTemplateMeal[]; }

const EXERCISE_SUGGESTIONS = [
  "Sentadilla con barra","Sentadilla goblet","Sentadilla búlgara","Prensa de piernas","Extensión de cuádriceps","Curl femoral","Peso muerto rumano","Hip thrust","Glute bridge","Estocada frontal","Estocada lateral","Estocada caminando","Step-up","Abducción de cadera",
  "Peso muerto convencional","Peso muerto sumo","Dominadas","Jalón al pecho","Remo con barra","Remo con mancuerna","Remo en polea baja","Pull-over","Face pull",
  "Press de banca plano","Press de banca inclinado","Press de banca declinado","Aperturas con mancuernas","Aperturas en polea","Fondos en paralelas","Flexiones",
  "Press militar","Press Arnold","Elevaciones laterales","Elevaciones frontales","Pájaros","Encogimiento de hombros",
  "Curl de bíceps con barra","Curl de bíceps con mancuerna","Curl martillo","Curl concentrado","Curl en polea","Press francés","Extensión de tríceps en polea","Patada de tríceps","Fondos tríceps en banco",
  "Plancha","Plancha lateral","Crunch","Crunch en polea","Elevación de piernas","Rueda abdominal","Bicicleta","Mountain climber","Russian twist",
  "Burpee","Salto a la caja","Kettlebell swing","Remo en máquina","Cinta de correr","Bicicleta estática","Elíptica",
];
const MEAL_SUGGESTIONS = ["Desayuno","Almuerzo","Cena","Colación","Merienda","Pre-entreno","Post-entreno"];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function TemplatesPage() {
  const [tab, setTab] = useState<"routines" | "diets">("routines");

  /* ── Routine template state ── */
  const [rTemplates,    setRTemplates]    = useState<RoutineTemplate[]>([]);
  const [rLoading,      setRLoading]      = useState(true);
  const [rShowForm,     setRShowForm]     = useState(false);
  const [rEditingId,    setREditingId]    = useState<string | null>(null);
  const [rName,         setRName]         = useState("");
  const [rDesc,         setRDesc]         = useState("");
  const [exercises,     setExercises]     = useState<ExForm[]>([{ ...EMPTY_EX }]);
  const [rSubmitting,   setRSubmitting]   = useState(false);
  const [rError,        setRError]        = useState("");
  const [rExpandedId,   setRExpandedId]   = useState<string | null>(null);

  /* ── Diet template state ── */
  const [dTemplates,    setDTemplates]    = useState<DietTemplate[]>([]);
  const [dLoading,      setDLoading]      = useState(true);
  const [dShowForm,     setDShowForm]     = useState(false);
  const [dEditingId,    setDEditingId]    = useState<string | null>(null);
  const [dName,         setDName]         = useState("");
  const [dDesc,         setDDesc]         = useState("");
  const [dCals,         setDCals]         = useState("");
  const [dProtein,      setDProtein]      = useState("");
  const [dCarbs,        setDCarbs]        = useState("");
  const [dFat,          setDFat]          = useState("");
  const [meals,         setMeals]         = useState<MealForm[]>([{ ...EMPTY_MEAL }]);
  const [dSubmitting,   setDSubmitting]   = useState(false);
  const [dError,        setDError]        = useState("");
  const [dExpandedId,   setDExpandedId]   = useState<string | null>(null);

  /* drag & drop for exercises */
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  /* ── Load data ── */
  useEffect(() => {
    api.get("/templates").then(r => setRTemplates(r.data.data)).finally(() => setRLoading(false));
    api.get("/diet-templates").then(r => setDTemplates(r.data.data)).finally(() => setDLoading(false));
  }, []);

  /* ── Routine helpers ── */
  function addEx()  { setExercises(p => [...p, { ...EMPTY_EX }]); }
  function removeEx(i: number) { setExercises(p => p.filter((_, j) => j !== i)); }
  function updateEx(i: number, f: keyof ExForm, v: string) { setExercises(p => p.map((e, j) => j === i ? { ...e, [f]: v } : e)); }
  function handleDragStart(i: number) { dragIdx.current = i; }
  function handleDragOver(e: React.DragEvent, i: number) { e.preventDefault(); setDragOver(i); }
  function handleDrop(i: number) {
    const from = dragIdx.current;
    if (from === null || from === i) { dragIdx.current = null; setDragOver(null); return; }
    setExercises(p => { const a = [...p]; const [it] = a.splice(from, 1); a.splice(i, 0, it); return a; });
    dragIdx.current = null; setDragOver(null);
  }

  function startEditRoutine(t: RoutineTemplate) {
    setREditingId(t.id);
    setRName(t.name);
    setRDesc(t.description ?? "");
    setExercises(t.exercises.map(e => ({ name: e.name, sets: String(e.sets), reps: String(e.reps), weight: e.weight ? String(e.weight) : "", notes: e.notes ?? "" })));
    setRShowForm(true); setRError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelRoutineForm() { setRShowForm(false); setREditingId(null); setRName(""); setRDesc(""); setExercises([{ ...EMPTY_EX }]); setRError(""); }

  async function submitRoutine(e: React.FormEvent) {
    e.preventDefault(); setRError("");
    if (exercises.some(ex => !ex.name.trim())) { setRError("Cada ejercicio debe tener nombre."); return; }
    setRSubmitting(true);
    const exPayload = exercises.map((ex, i) => ({ name: ex.name.trim(), sets: parseInt(ex.sets) || 3, reps: parseInt(ex.reps) || 10, weight: ex.weight ? parseFloat(ex.weight) : undefined, notes: ex.notes || undefined, order: i }));
    try {
      if (rEditingId) {
        const res = await api.patch(`/templates/${rEditingId}`, { name: rName, description: rDesc || undefined, exercises: exPayload });
        setRTemplates(p => p.map(t => t.id === rEditingId ? res.data.data : t));
      } else {
        const res = await api.post("/templates", { name: rName, description: rDesc || undefined, exercises: exPayload });
        setRTemplates(p => [res.data.data, ...p]);
      }
      cancelRoutineForm();
    } catch { setRError("Error al guardar la plantilla."); }
    finally { setRSubmitting(false); }
  }

  async function deleteRoutine(id: string) {
    if (!confirm("¿Eliminar esta plantilla de rutina?")) return;
    await api.delete(`/templates/${id}`);
    setRTemplates(p => p.filter(t => t.id !== id));
    if (rExpandedId === id) setRExpandedId(null);
  }

  /* ── Diet helpers ── */
  function addMeal() { setMeals(p => [...p, { ...EMPTY_MEAL }]); }
  function removeMeal(i: number) { setMeals(p => p.filter((_, j) => j !== i)); }
  function updateMeal(i: number, f: keyof MealForm, v: string) { setMeals(p => p.map((m, j) => j === i ? { ...m, [f]: v } : m)); }

  function startEditDiet(t: DietTemplate) {
    setDEditingId(t.id);
    setDName(t.name);
    setDDesc(t.description ?? "");
    setDCals(t.calories ? String(t.calories) : "");
    setDProtein(t.protein ? String(t.protein) : "");
    setDCarbs(t.carbs ? String(t.carbs) : "");
    setDFat(t.fat ? String(t.fat) : "");
    setMeals(t.meals.map(m => ({ name: m.name, time: m.time ?? "", foods: m.foods, calories: m.calories ? String(m.calories) : "", protein: m.protein ? String(m.protein) : "", carbs: m.carbs ? String(m.carbs) : "", fat: m.fat ? String(m.fat) : "", notes: m.notes ?? "" })));
    setDShowForm(true); setDError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelDietForm() { setDShowForm(false); setDEditingId(null); setDName(""); setDDesc(""); setDCals(""); setDProtein(""); setDCarbs(""); setDFat(""); setMeals([{ ...EMPTY_MEAL }]); setDError(""); }

  async function submitDiet(e: React.FormEvent) {
    e.preventDefault(); setDError("");
    if (meals.some(m => !m.name.trim() || !m.foods.trim())) { setDError("Cada comida debe tener nombre y alimentos."); return; }
    setDSubmitting(true);
    const mealPayload = meals.map((m, i) => ({ name: m.name.trim(), time: m.time || undefined, foods: m.foods.trim(), calories: m.calories ? parseInt(m.calories) : undefined, protein: m.protein ? parseInt(m.protein) : undefined, carbs: m.carbs ? parseInt(m.carbs) : undefined, fat: m.fat ? parseInt(m.fat) : undefined, notes: m.notes || undefined, order: i }));
    const body = { name: dName, description: dDesc || undefined, calories: dCals ? parseInt(dCals) : undefined, protein: dProtein ? parseInt(dProtein) : undefined, carbs: dCarbs ? parseInt(dCarbs) : undefined, fat: dFat ? parseInt(dFat) : undefined, meals: mealPayload };
    try {
      if (dEditingId) {
        const res = await api.patch(`/diet-templates/${dEditingId}`, body);
        setDTemplates(p => p.map(t => t.id === dEditingId ? res.data.data : t));
      } else {
        const res = await api.post("/diet-templates", body);
        setDTemplates(p => [res.data.data, ...p]);
      }
      cancelDietForm();
    } catch { setDError("Error al guardar la plantilla."); }
    finally { setDSubmitting(false); }
  }

  async function deleteDiet(id: string) {
    if (!confirm("¿Eliminar esta plantilla de dieta?")) return;
    await api.delete(`/diet-templates/${id}`);
    setDTemplates(p => p.filter(t => t.id !== id));
    if (dExpandedId === id) setDExpandedId(null);
  }

  /* ── Render ── */
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-white">Plantillas</h1>
        <p className="text-sm text-zinc-500 mt-1">Creá plantillas reutilizables de rutinas y dietas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 border border-white/[0.05] rounded-xl p-1 w-fit mb-6">
        {(["routines", "diets"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${tab === t ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
            {t === "routines" ? "🏋️ Rutinas" : "🥗 Dietas"}
          </button>
        ))}
      </div>

      {/* ══════════ RUTINAS TAB ══════════ */}
      {tab === "routines" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-zinc-500">{rTemplates.length} plantilla{rTemplates.length !== 1 ? "s" : ""}</p>
            <button onClick={() => rShowForm ? cancelRoutineForm() : setRShowForm(true)}
              className={`shrink-0 ${rShowForm ? "btn-ghost" : "btn-primary"}`}>
              {rShowForm ? "Cancelar" : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Nueva plantilla</>)}
            </button>
          </div>

          {/* Routine form */}
          {rShowForm && (
            <form onSubmit={submitRoutine} className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-4 sm:p-6 mb-6 space-y-5 animate-slide-up-sm">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                {rEditingId ? "Editar plantilla" : "Nueva plantilla de rutina"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre *</label>
                  <input value={rName} onChange={e => setRName(e.target.value)} required placeholder="Ej: Fullbody A" className="input-dark" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Descripción</label>
                  <input value={rDesc} onChange={e => setRDesc(e.target.value)} placeholder="Ej: Para principiantes con gym" className="input-dark" />
                </div>
              </div>

              {/* Exercises */}
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Ejercicios *</p>
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i)} onDragEnd={() => { dragIdx.current = null; setDragOver(null); }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${dragOver === i ? "border-orange-500/40 bg-orange-500/5" : "border-white/[0.06] bg-zinc-800/40"}`}>
                      <svg className="w-3.5 h-3.5 text-zinc-600 shrink-0 cursor-grab" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" /></svg>
                      <input value={ex.name} onChange={e => updateEx(i, "name", e.target.value)} required list="ex-suggestions"
                        placeholder="Nombre del ejercicio *" className="input-dark !py-1.5 !text-xs flex-1 min-w-0" />
                      <input value={ex.sets} onChange={e => updateEx(i, "sets", e.target.value)} type="number" min={1} max={20}
                        placeholder="Series" className="input-dark !py-1.5 !text-xs !w-16 text-center shrink-0" />
                      <input value={ex.reps} onChange={e => updateEx(i, "reps", e.target.value)} type="number" min={1} max={100}
                        placeholder="Reps" className="input-dark !py-1.5 !text-xs !w-16 text-center shrink-0" />
                      <input value={ex.weight} onChange={e => updateEx(i, "weight", e.target.value)} type="number" min={0} step={0.5}
                        placeholder="kg" className="input-dark !py-1.5 !text-xs !w-16 text-center shrink-0" />
                      {exercises.length > 1 && (
                        <button type="button" onClick={() => removeEx(i)} className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <datalist id="ex-suggestions">{EXERCISE_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
                <button type="button" onClick={addEx} className="mt-3 flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Agregar ejercicio
                </button>
              </div>

              {rError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{rError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={rSubmitting} className="btn-primary">
                  {rSubmitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</> : rEditingId ? "Guardar cambios" : "Crear plantilla"}
                </button>
                <button type="button" onClick={cancelRoutineForm} className="btn-ghost">Cancelar</button>
              </div>
            </form>
          )}

          {/* Routine template list */}
          {rLoading ? (
            <div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-zinc-700 border-t-orange-400 rounded-full animate-spin" /></div>
          ) : rTemplates.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-zinc-500 text-sm">
              Todavía no creaste ninguna plantilla de rutina.
            </div>
          ) : (
            <div className="space-y-3">
              {rTemplates.map(t => (
                <div key={t.id} className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 sm:px-5 py-4 gap-3">
                    <button className="flex-1 text-left min-w-0" onClick={() => setRExpandedId(rExpandedId === t.id ? null : t.id)}>
                      <p className="font-semibold text-white truncate">{t.name}</p>
                      {t.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{t.description}</p>}
                      <p className="text-xs text-zinc-600 mt-1">{t.exercises.length} ejercicio{t.exercises.length !== 1 ? "s" : ""}</p>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEditRoutine(t)} className="text-xs text-zinc-600 hover:text-orange-400 transition-colors px-1">Editar</button>
                      <button onClick={() => deleteRoutine(t.id)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors px-1">Eliminar</button>
                      <svg className={`w-4 h-4 text-zinc-600 transition-transform ${rExpandedId === t.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {rExpandedId === t.id && (
                    <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                      {t.exercises.map(ex => (
                        <div key={ex.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500/50 shrink-0" />
                          <span className="flex-1 text-sm text-zinc-300">{ex.name}</span>
                          <span className="text-xs text-zinc-600 tabular-nums">{ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}kg` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ DIETAS TAB ══════════ */}
      {tab === "diets" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-zinc-500">{dTemplates.length} plantilla{dTemplates.length !== 1 ? "s" : ""}</p>
            <button onClick={() => dShowForm ? cancelDietForm() : setDShowForm(true)}
              className={`shrink-0 ${dShowForm ? "btn-ghost" : "btn-primary"}`}>
              {dShowForm ? "Cancelar" : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Nueva plantilla</>)}
            </button>
          </div>

          {/* Diet form */}
          {dShowForm && (
            <form onSubmit={submitDiet} className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-4 sm:p-6 mb-6 space-y-5 animate-slide-up-sm">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                {dEditingId ? "Editar plantilla" : "Nueva plantilla de dieta"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre *</label>
                  <input value={dName} onChange={e => setDName(e.target.value)} required placeholder="Ej: Plan de volumen" className="input-dark" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Descripción</label>
                  <input value={dDesc} onChange={e => setDDesc(e.target.value)} placeholder="Objetivo del plan..." className="input-dark" />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Objetivos diarios (opcional)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Calorías", val: dCals,    set: setDCals,    p: "kcal", color: "text-orange-400" },
                    { label: "Proteínas", val: dProtein, set: setDProtein, p: "g",    color: "text-orange-300" },
                    { label: "Carbos",    val: dCarbs,   set: setDCarbs,   p: "g",    color: "text-blue-400"   },
                    { label: "Grasas",    val: dFat,     set: setDFat,     p: "g",    color: "text-emerald-400" },
                  ].map(({ label, val, set, p, color }) => (
                    <div key={label}>
                      <label className={`block text-xs font-bold ${color} mb-1.5`}>{label}</label>
                      <input type="number" min={0} value={val} onChange={e => set(e.target.value)} placeholder={p} className="input-dark !py-2 !text-xs text-center" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Comidas *</p>
                <div className="space-y-3">
                  {meals.map((meal, i) => (
                    <div key={i} className="bg-zinc-800/50 border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input value={meal.name} onChange={e => updateMeal(i, "name", e.target.value)} required
                            placeholder="Nombre de la comida *" className="input-dark !py-2 !text-xs" list={`d-meal-${i}`} />
                          <datalist id={`d-meal-${i}`}>{MEAL_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
                        </div>
                        <input value={meal.time} onChange={e => updateMeal(i, "time", e.target.value)} type="time" className="input-dark !py-2 !text-xs !w-28 shrink-0" />
                        {meals.length > 1 && (
                          <button type="button" onClick={() => removeMeal(i)} className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0">×</button>
                        )}
                      </div>
                      <textarea value={meal.foods} onChange={e => updateMeal(i, "foods", e.target.value)} required
                        placeholder="Alimentos: 200g pechuga, arroz integral, brócoli..." rows={2}
                        className="input-dark !py-2 !text-xs resize-none" />
                      <div className="grid grid-cols-4 gap-2">
                        {([["calories","kcal"],["protein","P(g)"],["carbs","C(g)"],["fat","G(g)"]] as const).map(([f, ph]) => (
                          <input key={f} type="number" min={0} value={meal[f]} onChange={e => updateMeal(i, f, e.target.value)}
                            placeholder={ph} className="input-dark !py-1.5 !text-xs text-center" />
                        ))}
                      </div>
                      <input value={meal.notes} onChange={e => updateMeal(i, "notes", e.target.value)}
                        placeholder="Nota opcional" className="input-dark !py-2 !text-xs" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addMeal} className="mt-3 flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Agregar comida
                </button>
              </div>

              {dError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{dError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={dSubmitting} className="btn-primary">
                  {dSubmitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</> : dEditingId ? "Guardar cambios" : "Crear plantilla"}
                </button>
                <button type="button" onClick={cancelDietForm} className="btn-ghost">Cancelar</button>
              </div>
            </form>
          )}

          {/* Diet template list */}
          {dLoading ? (
            <div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-zinc-700 border-t-orange-400 rounded-full animate-spin" /></div>
          ) : dTemplates.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-zinc-500 text-sm">
              Todavía no creaste ninguna plantilla de dieta.
            </div>
          ) : (
            <div className="space-y-3">
              {dTemplates.map(t => (
                <div key={t.id} className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 sm:px-5 py-4 gap-3">
                    <button className="flex-1 text-left min-w-0" onClick={() => setDExpandedId(dExpandedId === t.id ? null : t.id)}>
                      <p className="font-semibold text-white truncate">{t.name}</p>
                      {t.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{t.description}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-zinc-600">{t.meals.length} comida{t.meals.length !== 1 ? "s" : ""}</span>
                        {t.calories && <span className="text-xs text-orange-400/70">{t.calories} kcal</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEditDiet(t)} className="text-xs text-zinc-600 hover:text-orange-400 transition-colors px-1">Editar</button>
                      <button onClick={() => deleteDiet(t.id)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors px-1">Eliminar</button>
                      <svg className={`w-4 h-4 text-zinc-600 transition-transform ${dExpandedId === t.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {dExpandedId === t.id && (
                    <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                      {t.meals.map(m => (
                        <div key={m.id} className="px-4 sm:px-5 py-2.5 flex items-start gap-3">
                          <span className="text-base shrink-0 mt-0.5">
                            {m.name.toLowerCase().includes("desayuno") || m.name.toLowerCase().includes("mañana") ? "☀️" : m.name.toLowerCase().includes("almuerzo") ? "🍽️" : m.name.toLowerCase().includes("cena") ? "🌙" : m.name.toLowerCase().includes("pre") ? "⚡" : m.name.toLowerCase().includes("post") ? "💪" : "🥜"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-zinc-300">{m.name}</span>
                              {m.time && <span className="text-xs text-zinc-600">{m.time}</span>}
                              {m.calories && <span className="text-xs text-orange-400/70">{m.calories} kcal</span>}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{m.foods}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
