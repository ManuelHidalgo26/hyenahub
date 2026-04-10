"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface ClientDetail {
  id: string; goal: string; experience: string; equipment: string;
  weight: number | null; age: number | null; notes: string | null;
  user: { id: string; name: string; email: string };
  routines: Routine[];
}
interface Exercise {
  id: string; name: string; sets: number; reps: number;
  weight: number | null; notes: string | null; clientNote: string | null;
  completed: boolean; order: number;
}
interface WeeklyFeedback { rating: number; comment: string | null; }
interface Routine {
  id: string; weekStart: string; notes: string | null; exercises: Exercise[];
  feedback?: WeeklyFeedback | null;
}
interface MealForm { name: string; time: string; foods: string; calories: string; protein: string; carbs: string; fat: string; notes: string; }
interface Diet {
  id: string; name: string; description: string | null;
  calories: number | null; protein: number | null; carbs: number | null; fat: number | null;
  createdAt: string;
  meals: { id: string; name: string; time: string | null; foods: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; notes: string | null; order: number }[];
}
interface ExForm { name: string; sets: string; reps: string; weight: string; notes: string; }
interface RoutineTemplate {
  id: string; name: string; description: string | null;
  exercises: { name: string; sets: number; reps: number; weight: number | null; notes: string | null; order: number }[];
}
const EMPTY: ExForm = { name: "", sets: "3", reps: "10", weight: "", notes: "" };
const EMPTY_MEAL: MealForm = { name: "", time: "", foods: "", calories: "", protein: "", carbs: "", fat: "", notes: "" };
const MEAL_SUGGESTIONS = ["Desayuno", "Almuerzo", "Cena", "Colación", "Merienda", "Pre-entreno", "Post-entreno"];
const EXERCISE_SUGGESTIONS = [
  // Piernas
  "Sentadilla con barra", "Sentadilla goblet", "Sentadilla búlgara", "Prensa de piernas",
  "Extensión de cuádriceps", "Curl femoral", "Peso muerto rumano", "Hip thrust", "Glute bridge",
  "Estocada frontal", "Estocada lateral", "Estocada caminando", "Step-up", "Abducción de cadera",
  // Espalda
  "Peso muerto convencional", "Peso muerto sumo", "Dominadas", "Jalón al pecho",
  "Remo con barra", "Remo con mancuerna", "Remo en polea baja", "Pull-over", "Face pull",
  // Pecho
  "Press de banca plano", "Press de banca inclinado", "Press de banca declinado",
  "Aperturas con mancuernas", "Aperturas en polea", "Fondos en paralelas", "Flexiones",
  // Hombros
  "Press militar", "Press Arnold", "Elevaciones laterales", "Elevaciones frontales",
  "Pájaros", "Encogimiento de hombros",
  // Bíceps / Tríceps
  "Curl de bíceps con barra", "Curl de bíceps con mancuerna", "Curl martillo",
  "Curl concentrado", "Curl en polea", "Press francés", "Extensión de tríceps en polea",
  "Patada de tríceps", "Fondos tríceps en banco",
  // Core / Abdomen
  "Plancha", "Plancha lateral", "Crunch", "Crunch en polea", "Elevación de piernas",
  "Rueda abdominal", "Bicicleta", "Mountain climber", "Russian twist",
  // Cardio / Funcional
  "Burpee", "Salto a la caja", "Salto al cajón", "Kettlebell swing",
  "Remo en máquina", "Cinta de correr", "Bicicleta estática", "Elíptica",
];

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function getMonday() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}
function formatWeek(s: string) {
  return new Date(s).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}
function pct(exs: Exercise[]) {
  if (!exs.length) return 0;
  return Math.round((exs.filter(e => e.completed).length / exs.length) * 100);
}

const EXP: Record<string, string> = { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" };
const EQ:  Record<string, string> = { none: "Sin equipo", home: "Casa", gym: "Gym", full: "Completo" };

/* ─── Page ─────────────────────────────────────────────────────────────────── */
export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const [client,     setClient]     = useState<ClientDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<"routines" | "diet">("routines");

  // Routine form
  const [showForm,     setShowForm]     = useState(false);
  const [weekStart,    setWeekStart]    = useState(getMonday());
  const [routineNote,  setRoutineNote]  = useState("");
  const [exercises,    setExercises]    = useState<ExForm[]>([{ ...EMPTY }]);
  const [submitting,   setSubmitting]   = useState(false);
  const [formError,    setFormError]    = useState("");

  // Templates
  const [templates,     setTemplates]     = useState<RoutineTemplate[]>([]);
  const [loadTemplates, setLoadTemplates] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savingTpl,     setSavingTpl]     = useState(false);
  const [tplName,       setTplName]       = useState("");

  // Note modal
  const [noteModal,  setNoteModal]  = useState<{ exerciseName: string; note: string } | null>(null);

  // Password reset
  const [resetting,  setResetting]  = useState(false);
  const [tempPass,   setTempPass]   = useState<string | null>(null);

  async function resetPassword() {
    if (!confirm(`¿Resetear la contraseña de ${client?.user.name}? Se generará una contraseña temporal.`)) return;
    setResetting(true);
    try {
      const res = await api.post(`/trainer/clients/${clientId}/reset-password`);
      setTempPass(res.data.data.tempPassword);
    } catch {
      alert("No se pudo resetear la contraseña.");
    } finally {
      setResetting(false);
    }
  }

  // Diet state
  const [diets,      setDiets]      = useState<Diet[]>([]);
  const [loadingDiets, setLoadingDiets] = useState(false);
  const [showDietForm, setShowDietForm] = useState(false);
  const [dietName,   setDietName]   = useState("");
  const [dietDesc,   setDietDesc]   = useState("");
  const [dietCals,   setDietCals]   = useState("");
  const [dietProtein, setDietProtein] = useState("");
  const [dietCarbs,  setDietCarbs]  = useState("");
  const [dietFat,    setDietFat]    = useState("");
  const [meals,      setMeals]      = useState<MealForm[]>([{ ...EMPTY_MEAL }]);
  const [dietSubmitting, setDietSubmitting] = useState(false);
  const [dietError,  setDietError]  = useState("");

  useEffect(() => {
    api.get(`/trainer/clients/${clientId}`)
      .then(r => setClient(r.data.data))
      .catch(() => router.push("/trainer"))
      .finally(() => setLoading(false));
  }, [clientId]);

  // Load diets when diet tab is opened
  useEffect(() => {
    if (activeTab !== "diet" || !clientId) return;
    setLoadingDiets(true);
    api.get(`/diets/client/${clientId}`)
      .then(r => setDiets(r.data.data))
      .finally(() => setLoadingDiets(false));
  }, [activeTab, clientId]);

  // Drag & drop state for exercise reordering
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function addEx()                { setExercises(p => [...p, { ...EMPTY }]); }
  function removeEx(i: number)    { setExercises(p => p.filter((_, j) => j !== i)); }
  function updateEx(i: number, f: keyof ExForm, v: string) {
    setExercises(p => p.map((ex, j) => j === i ? { ...ex, [f]: v } : ex));
  }
  function handleDragStart(i: number) { dragIdx.current = i; }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault(); setDragOverIdx(i);
  }
  function handleDrop(i: number) {
    const from = dragIdx.current;
    if (from === null || from === i) { dragIdx.current = null; setDragOverIdx(null); return; }
    setExercises(p => {
      const arr = [...p];
      const [item] = arr.splice(from, 1);
      arr.splice(i, 0, item);
      return arr;
    });
    dragIdx.current = null; setDragOverIdx(null);
  }
  function handleDragEnd() { dragIdx.current = null; setDragOverIdx(null); }

  async function loadTemplatesList() {
    if (templates.length > 0) { setShowTemplates(true); return; }
    setLoadTemplates(true);
    try {
      const res = await api.get("/templates");
      setTemplates(res.data.data);
      setShowTemplates(true);
    } finally {
      setLoadTemplates(false);
    }
  }

  function applyTemplate(t: RoutineTemplate) {
    setExercises(t.exercises.map(ex => ({
      name:   ex.name,
      sets:   String(ex.sets),
      reps:   String(ex.reps),
      weight: ex.weight ? String(ex.weight) : "",
      notes:  ex.notes ?? "",
    })));
    setShowTemplates(false);
  }

  async function saveAsTemplate() {
    const name = tplName.trim() || `Template ${new Date().toLocaleDateString("es-AR")}`;
    if (exercises.some(ex => !ex.name.trim())) return;
    setSavingTpl(true);
    try {
      const res = await api.post("/templates", {
        name,
        exercises: exercises.map((ex, i) => ({
          name: ex.name.trim(), sets: parseInt(ex.sets) || 3,
          reps: parseInt(ex.reps) || 10,
          weight: ex.weight ? parseFloat(ex.weight) : undefined,
          notes: ex.notes || undefined, order: i,
        })),
      });
      setTemplates(p => [res.data.data, ...p]);
      setTplName("");
    } finally {
      setSavingTpl(false);
    }
  }

  async function deleteTemplate(id: string) {
    await api.delete(`/templates/${id}`);
    setTemplates(p => p.filter(t => t.id !== id));
  }

  // Diet helpers
  function addMeal()    { setMeals(p => [...p, { ...EMPTY_MEAL }]); }
  function removeMeal(i: number) { setMeals(p => p.filter((_, j) => j !== i)); }
  function updateMeal(i: number, f: keyof MealForm, v: string) {
    setMeals(p => p.map((m, j) => j === i ? { ...m, [f]: v } : m));
  }

  async function submitDiet(e: React.FormEvent) {
    e.preventDefault();
    setDietError("");
    if (meals.some(m => !m.name.trim() || !m.foods.trim())) {
      setDietError("Cada comida debe tener nombre y alimentos.");
      return;
    }
    setDietSubmitting(true);
    try {
      const res = await api.post("/diets", {
        clientId,
        name: dietName,
        description: dietDesc || undefined,
        calories: dietCals    ? parseInt(dietCals)    : undefined,
        protein:  dietProtein ? parseInt(dietProtein) : undefined,
        carbs:    dietCarbs   ? parseInt(dietCarbs)   : undefined,
        fat:      dietFat     ? parseInt(dietFat)     : undefined,
        meals: meals.map((m, i) => ({
          name:     m.name.trim(),
          time:     m.time || undefined,
          foods:    m.foods.trim(),
          calories: m.calories ? parseInt(m.calories) : undefined,
          protein:  m.protein  ? parseInt(m.protein)  : undefined,
          carbs:    m.carbs    ? parseInt(m.carbs)    : undefined,
          fat:      m.fat      ? parseInt(m.fat)      : undefined,
          notes:    m.notes    || undefined,
          order: i,
        })),
      });
      setDiets(p => [res.data.data, ...p]);
      setShowDietForm(false);
      setDietName(""); setDietDesc(""); setDietCals(""); setDietProtein(""); setDietCarbs(""); setDietFat("");
      setMeals([{ ...EMPTY_MEAL }]);
    } catch (err: unknown) {
      setDietError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al crear la dieta.");
    } finally {
      setDietSubmitting(false);
    }
  }

  async function deleteDiet(id: string) {
    if (!confirm("¿Eliminar esta dieta?")) return;
    await api.delete(`/diets/${id}`);
    setDiets(p => p.filter(d => d.id !== id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (exercises.some(ex => !ex.name.trim())) { setFormError("Cada ejercicio debe tener nombre."); return; }
    setSubmitting(true);
    try {
      await api.post("/routines", {
        clientId,
        weekStart: new Date(weekStart + "T00:00:00.000Z").toISOString(),
        notes: routineNote || undefined,
        exercises: exercises.map((ex, i) => ({
          name: ex.name.trim(), sets: parseInt(ex.sets) || 3,
          reps: parseInt(ex.reps) || 10,
          weight: ex.weight ? parseFloat(ex.weight) : undefined,
          notes: ex.notes || undefined, order: i,
        })),
      });
      const r = await api.get(`/trainer/clients/${clientId}`);
      setClient(r.data.data);
      setShowForm(false); setWeekStart(getMonday()); setRoutineNote(""); setExercises([{ ...EMPTY }]);
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al crear la rutina.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRoutine(id: string) {
    if (!confirm("¿Eliminar esta rutina?")) return;
    await api.delete(`/routines/${id}`);
    setClient(p => p ? { ...p, routines: p.routines.filter(r => r.id !== id) } : p);
  }

  if (loading) return <LoadingScreen />;
  if (!client)  return null;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">

      {/* ── Note modal ─────────────────────────────────────────────────── */}
      {noteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setNoteModal(null)}>
          <div className="w-full max-w-md bg-zinc-900 border border-yellow-500/20 rounded-2xl overflow-hidden shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest">Nota del cliente</p>
                <p className="text-sm font-bold text-white mt-0.5">{noteModal.exerciseName}</p>
              </div>
              <button onClick={() => setNoteModal(null)} className="text-zinc-500 hover:text-white text-2xl leading-none transition-colors">×</button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-yellow-400/80 italic leading-relaxed whitespace-pre-wrap">&ldquo;{noteModal.note}&rdquo;</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Temp password modal ────────────────────────────────────────── */}
      {tempPass && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setTempPass(null)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-orange-500/20 rounded-2xl overflow-hidden shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <p className="font-bold text-white">Contraseña temporal</p>
              <button onClick={() => setTempPass(null)} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-5 py-5 space-y-3">
              <p className="text-sm text-zinc-400">Compartí esta contraseña con <span className="text-white font-semibold">{client?.user.name}</span> para que pueda ingresar:</p>
              <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3">
                <span className="flex-1 font-mono font-bold text-orange-400 text-lg tracking-widest">{tempPass}</span>
                <button onClick={() => { navigator.clipboard.writeText(tempPass); }}
                  className="text-xs text-zinc-500 hover:text-white border border-white/10 rounded-lg px-2 py-1 transition-colors">
                  Copiar
                </button>
              </div>
              <p className="text-xs text-zinc-600">El cliente deberá cambiarla desde su perfil cuando ingrese.</p>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push("/trainer")}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-5 sm:mb-6 group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al dashboard
      </button>

      {/* Client profile card */}
      <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden mb-5 sm:mb-6 animate-slide-up">
        {/* Gradient banner */}
        <div className="h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500" />
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-orange-500/25">
              {client.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white">{client.user.name}</h1>
              <p className="text-sm text-zinc-500">{client.user.email}</p>
              <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{client.goal}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoPill label="Nivel"        value={EXP[client.experience] ?? client.experience} />
            <InfoPill label="Equipamiento" value={EQ[client.equipment]   ?? client.equipment} />
            {client.weight && <InfoPill label="Peso" value={`${client.weight} kg`} />}
            {client.age    && <InfoPill label="Edad" value={`${client.age} años`} />}
          </div>

          {client.notes && (
            <p className="mt-4 text-sm text-zinc-400 bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3">
              {client.notes}
            </p>
          )}

          <button
            onClick={resetPassword}
            disabled={resetting}
            className="mt-3 text-xs text-zinc-600 hover:text-orange-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            🔑 {resetting ? "Reseteando..." : "Resetear contraseña"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 border border-white/[0.05] rounded-xl p-1 w-fit mb-5">
        {(["routines", "diet"] as const).map(t => (
          <button key={t} onClick={() => { setActiveTab(t); setShowForm(false); setShowDietForm(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === t ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {t === "routines" ? "🏋️ Rutinas" : "🥗 Dieta"}
          </button>
        ))}
      </div>

      {/* ── ROUTINES TAB ───────────────────────────────────────────────── */}
      {activeTab === "routines" && (
      <div className="flex items-center justify-between mb-4 sm:mb-5 gap-3">
        <h2 className="text-base font-bold text-white">
          Rutinas
          <span className="ml-2 text-sm font-normal text-zinc-500">({client.routines.length})</span>
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className={`shrink-0 ${showForm ? "btn-ghost" : "btn-primary"}`}
        >
          {showForm ? "Cancelar" : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nueva </span>Rutina
            </>
          )}
        </button>
      </div>)}

      {/* Create routine form */}
      {showForm && (
        <form onSubmit={submit} className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-4 sm:p-6 mb-5 sm:mb-6 space-y-5 animate-slide-up-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              Nueva rutina para {client.user.name}
            </h3>
            <button type="button" onClick={loadTemplatesList} disabled={loadTemplates}
              className="shrink-0 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors border border-white/[0.06] hover:border-orange-500/30 px-3 py-1.5 rounded-lg bg-zinc-800/50">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {loadTemplates ? "Cargando..." : "Usar template"}
            </button>
          </div>

          {/* Template picker */}
          {showTemplates && (
            <div className="bg-zinc-800/60 border border-white/[0.06] rounded-xl p-3 space-y-2 animate-slide-up-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mis templates</p>
                <button type="button" onClick={() => setShowTemplates(false)}
                  className="text-zinc-600 hover:text-zinc-400 text-lg leading-none">×</button>
              </div>
              {templates.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-3">Todavía no guardaste ningún template.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-zinc-700/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{t.name}</p>
                        <p className="text-xs text-zinc-600">{t.exercises.length} ejercicios</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => applyTemplate(t)}
                          className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors">
                          Aplicar
                        </button>
                        <button type="button" onClick={() => deleteTemplate(t.id)}
                          className="text-xs text-zinc-700 hover:text-red-400 transition-colors">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Semana del</label>
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                className="input-dark !w-auto" required />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nota general</label>
              <input type="text" value={routineNote} onChange={e => setRoutineNote(e.target.value)}
                placeholder="Ej: Semana de carga progresiva..." className="input-dark" />
            </div>
          </div>

          {/* Exercise rows */}
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Ejercicios
              {exercises.length > 1 && <span className="ml-2 font-normal normal-case text-zinc-700">arrastrá para reordenar</span>}
            </p>
            <div className="space-y-2.5">
              {exercises.map((ex, i) => (
                <div key={i}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  className={`grid grid-cols-12 gap-2 items-center bg-zinc-800/50 border rounded-xl p-3 transition-all duration-150 ${
                    dragOverIdx === i && dragIdx.current !== i
                      ? "border-orange-500/50 bg-orange-500/5"
                      : "border-white/5"
                  }`}>
                  {/* Drag handle */}
                  <div className="col-span-1 flex justify-center cursor-grab active:cursor-grabbing">
                    <svg className="w-4 h-4 text-zinc-700 hover:text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="9" cy="7"  r="1.5"/><circle cx="15" cy="7"  r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
                    </svg>
                  </div>
                  <div className="col-span-11 sm:col-span-3">
                    <input placeholder="Nombre del ejercicio *" value={ex.name}
                      onChange={e => updateEx(i, "name", e.target.value)}
                      className="input-dark !py-2 !text-xs" required
                      list="exercise-suggestions" autoComplete="off" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <input type="number" min={1} value={ex.sets} onChange={e => updateEx(i, "sets", e.target.value)}
                      className="input-dark !py-2 !text-xs text-center" />
                    <p className="text-[10px] text-zinc-600 text-center mt-1">Series</p>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <input type="number" min={1} value={ex.reps} onChange={e => updateEx(i, "reps", e.target.value)}
                      className="input-dark !py-2 !text-xs text-center" />
                    <p className="text-[10px] text-zinc-600 text-center mt-1">Reps</p>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <input type="number" min={0} step={0.5} value={ex.weight} placeholder="—"
                      onChange={e => updateEx(i, "weight", e.target.value)}
                      className="input-dark !py-2 !text-xs text-center" />
                    <p className="text-[10px] text-zinc-600 text-center mt-1">Peso kg</p>
                  </div>
                  <div className="col-span-11 sm:col-span-1">
                    <input placeholder="Nota" value={ex.notes} onChange={e => updateEx(i, "notes", e.target.value)}
                      className="input-dark !py-2 !text-xs" />
                  </div>
                  {exercises.length > 1 && (
                    <div className="col-span-1 flex justify-center">
                      <button type="button" onClick={() => removeEx(i)}
                        className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addEx}
              className="mt-3 flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar ejercicio
            </button>
          </div>

          {/* Save as template */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
            <input
              value={tplName}
              onChange={e => setTplName(e.target.value)}
              placeholder="Guardar como template (nombre opcional)"
              className="flex-1 bg-zinc-800/60 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-orange-500/30"
            />
            <button type="button" onClick={saveAsTemplate} disabled={savingTpl}
              className="shrink-0 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 border border-white/[0.06] hover:border-orange-500/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {savingTpl ? "Guardando..." : "Guardar"}
            </button>
          </div>

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{formError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              ) : "Guardar rutina"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
          </div>
          <datalist id="exercise-suggestions">
            {EXERCISE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>
        </form>
      )}

      {/* Routine history — only in routines tab */}
      {activeTab === "routines" && (client.routines.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-10 sm:p-12 text-center text-zinc-500 text-sm">
          Todavía no se crearon rutinas para este cliente.
        </div>
      ) : (
        <div className="space-y-4">
          {client.routines.map((routine, idx) => {
            const p = pct(routine.exercises);
            const done = routine.exercises.filter(e => e.completed).length;
            return (
              <div key={routine.id} className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden animate-slide-up"
                style={{ animationDelay: `${idx * 60}ms` }}>
                {/* Progress bar top */}
                <div className="h-0.5 bg-zinc-800">
                  <div className="h-full transition-all duration-700"
                    style={{ width: `${p}%`, background: p === 100 ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#f97316,#fbbf24)" }} />
                </div>

                {/* Header */}
                <div className="flex items-start sm:items-center justify-between px-4 sm:px-5 py-4 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        Semana del {formatWeek(routine.weekStart)}
                      </span>
                      {idx === 0 && (
                        <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 font-medium px-2 py-0.5 rounded-full">
                          Más reciente
                        </span>
                      )}
                    </div>
                    {routine.notes && <p className="text-xs text-zinc-500 mt-0.5">{routine.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right mr-1">
                      <p className={`text-sm font-bold ${p === 100 ? "text-emerald-400" : "text-zinc-300"}`}>
                        {p === 100 ? "Completo ✓" : `${done}/${routine.exercises.length}`}
                      </p>
                      <p className="text-xs text-zinc-600">{p}%</p>
                    </div>
                    <button
                      onClick={async () => { const { downloadRoutinePDF } = await import("@/lib/pdf"); downloadRoutinePDF(routine, client.user.name); }}
                      title="Descargar PDF"
                      className="p-1.5 rounded-lg text-zinc-700 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteRoutine(routine.id)}
                      className="text-zinc-700 hover:text-red-400 transition-colors text-xs px-1">
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Exercises */}
                <div className="divide-y divide-white/[0.04] border-t border-white/[0.04]">
                  {routine.exercises.map(ex => (
                    <div key={ex.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors ${ex.completed ? "bg-emerald-500/5" : ""}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${ex.completed ? "bg-emerald-400" : "bg-zinc-700"}`} />
                      <span className={`flex-1 text-sm ${ex.completed ? "text-emerald-400/70 line-through decoration-emerald-600" : "text-zinc-300"}`}>
                        {ex.name}
                      </span>
                      <span className="text-xs text-zinc-600 tabular-nums">
                        {ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}kg` : ""}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Client notes summary */}
                {routine.exercises.some(e => e.clientNote) && (
                  <div className="px-4 sm:px-5 py-3 border-t border-white/[0.04] bg-yellow-500/[0.03]">
                    <p className="text-xs text-zinc-600 font-semibold uppercase tracking-widest mb-2">Notas del cliente</p>
                    {routine.exercises.filter(e => e.clientNote).map(e => (
                      <button key={e.id}
                        onClick={() => setNoteModal({ exerciseName: e.name, note: e.clientNote! })}
                        className="text-xs text-yellow-500/70 italic mb-1 text-left hover:text-yellow-400 transition-colors w-full cursor-pointer">
                        <span className="text-zinc-500 not-italic font-medium">{e.name}:</span>{" "}
                        <span className="line-clamp-1">{e.clientNote}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Weekly feedback from client */}
                {routine.feedback && (
                  <div className="px-4 sm:px-5 py-3 border-t border-white/[0.04] flex items-center gap-3">
                    <div className="flex gap-0.5 shrink-0">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} className={`w-3.5 h-3.5 ${s <= routine.feedback!.rating ? "text-orange-400" : "text-zinc-700"}`}
                          fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-zinc-500">Valoración del cliente</span>
                    {routine.feedback.comment && (
                      <span className="text-xs text-zinc-600 italic truncate">&ldquo;{routine.feedback.comment}&rdquo;</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* ── DIET TAB ────────────────────────────────────────────────────── */}
      {activeTab === "diet" && (
        <div>
          {/* Diet toolbar */}
          <div className="flex items-center justify-between mb-4 sm:mb-5 gap-3">
            <h2 className="text-base font-bold text-white">
              Plan de dieta
              <span className="ml-2 text-sm font-normal text-zinc-500">({diets.length})</span>
            </h2>
            <button onClick={() => setShowDietForm(v => !v)}
              className={`shrink-0 ${showDietForm ? "btn-ghost" : "btn-primary"}`}>
              {showDietForm ? "Cancelar" : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">Nueva </span>Dieta</>
              )}
            </button>
          </div>

          {/* Diet form */}
          {showDietForm && (
            <form onSubmit={submitDiet} className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-4 sm:p-6 mb-5 space-y-5 animate-slide-up-sm">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" /> Nuevo plan de dieta
              </h3>

              {/* Name + description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre del plan *</label>
                  <input value={dietName} onChange={e => setDietName(e.target.value)} required
                    placeholder="Ej: Plan de volumen" className="input-dark" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Descripción</label>
                  <input value={dietDesc} onChange={e => setDietDesc(e.target.value)}
                    placeholder="Objetivo del plan..." className="input-dark" />
                </div>
              </div>

              {/* Daily macros */}
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Objetivos diarios (opcional)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Calorías", val: dietCals,    set: setDietCals,    placeholder: "kcal", color: "text-orange-400" },
                    { label: "Proteínas", val: dietProtein, set: setDietProtein, placeholder: "g",    color: "text-orange-300" },
                    { label: "Carbos",    val: dietCarbs,   set: setDietCarbs,   placeholder: "g",    color: "text-blue-400"   },
                    { label: "Grasas",    val: dietFat,     set: setDietFat,     placeholder: "g",    color: "text-emerald-400" },
                  ].map(({ label, val, set, placeholder, color }) => (
                    <div key={label}>
                      <label className={`block text-xs font-bold ${color} mb-1.5`}>{label}</label>
                      <input type="number" min={0} value={val} onChange={e => set(e.target.value)}
                        placeholder={placeholder} className="input-dark !py-2 !text-xs text-center" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Meals */}
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Comidas del día *</p>
                <div className="space-y-3">
                  {meals.map((meal, i) => (
                    <div key={i} className="bg-zinc-800/50 border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Meal name — quick suggestions */}
                        <div className="flex-1 relative">
                          <input value={meal.name} onChange={e => updateMeal(i, "name", e.target.value)} required
                            placeholder="Nombre de la comida *" className="input-dark !py-2 !text-xs" list={`meal-suggestions-${i}`} />
                          <datalist id={`meal-suggestions-${i}`}>
                            {MEAL_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                          </datalist>
                        </div>
                        <input value={meal.time} onChange={e => updateMeal(i, "time", e.target.value)}
                          type="time" className="input-dark !py-2 !text-xs !w-28 shrink-0" />
                        {meals.length > 1 && (
                          <button type="button" onClick={() => removeMeal(i)}
                            className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0">×</button>
                        )}
                      </div>
                      <textarea value={meal.foods} onChange={e => updateMeal(i, "foods", e.target.value)} required
                        placeholder="Alimentos: 200g pechuga de pollo, arroz integral, brócoli..." rows={2}
                        className="input-dark !py-2 !text-xs resize-none" />
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { f: "calories" as const, p: "kcal" },
                          { f: "protein"  as const, p: "P(g)" },
                          { f: "carbs"    as const, p: "C(g)" },
                          { f: "fat"      as const, p: "G(g)" },
                        ].map(({ f, p }) => (
                          <input key={f} type="number" min={0} value={meal[f]} onChange={e => updateMeal(i, f, e.target.value)}
                            placeholder={p} className="input-dark !py-1.5 !text-xs text-center" />
                        ))}
                      </div>
                      <input value={meal.notes} onChange={e => updateMeal(i, "notes", e.target.value)}
                        placeholder="Nota opcional (ej: evitar si es día de descanso)" className="input-dark !py-2 !text-xs" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addMeal}
                  className="mt-3 flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar comida
                </button>
              </div>

              {dietError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{dietError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={dietSubmitting} className="btn-primary">
                  {dietSubmitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</> : "Guardar dieta"}
                </button>
                <button type="button" onClick={() => setShowDietForm(false)} className="btn-ghost">Cancelar</button>
              </div>
            </form>
          )}

          {/* Diets list */}
          {loadingDiets ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-zinc-800 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : diets.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 sm:p-12 text-center">
              <div className="text-3xl mb-3">🥗</div>
              <p className="text-zinc-500 text-sm">Todavía no creaste un plan de dieta para este cliente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {diets.map((diet, idx) => (
                <div key={diet.id} className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${idx * 60}ms` }}>
                  {/* Header */}
                  <div className="flex items-start justify-between px-4 sm:px-5 py-4 border-b border-white/[0.04] gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{diet.name}</span>
                        {idx === 0 && <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">Actual</span>}
                      </div>
                      {diet.description && <p className="text-xs text-zinc-500 mt-0.5">{diet.description}</p>}
                      {/* Macros summary */}
                      <div className="flex gap-2 flex-wrap mt-2">
                        {diet.calories && <span className="text-xs text-orange-400 font-semibold">{diet.calories} kcal</span>}
                        {diet.protein  && <span className="text-xs text-zinc-500">P: {diet.protein}g</span>}
                        {diet.carbs    && <span className="text-xs text-zinc-500">C: {diet.carbs}g</span>}
                        {diet.fat      && <span className="text-xs text-zinc-500">G: {diet.fat}g</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={async () => { const { downloadDietPDF } = await import("@/lib/pdf"); downloadDietPDF(diet, client.user.name); }}
                        title="Descargar PDF"
                        className="p-1.5 rounded-lg text-zinc-700 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteDiet(diet.id)} className="text-zinc-700 hover:text-red-400 transition-colors text-xs px-1">
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {/* Meals summary */}
                  <div className="divide-y divide-white/[0.04]">
                    {diet.meals.map(meal => (
                      <div key={meal.id} className="px-4 sm:px-5 py-3 flex items-start gap-3">
                        <span className="text-base shrink-0 mt-0.5">
                          {["desayuno","mañana"].some(k => meal.name.toLowerCase().includes(k)) ? "☀️"
                            : meal.name.toLowerCase().includes("almuerzo") ? "🍽️"
                            : meal.name.toLowerCase().includes("cena") ? "🌙"
                            : meal.name.toLowerCase().includes("pre") ? "⚡"
                            : meal.name.toLowerCase().includes("post") ? "💪"
                            : "🥜"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{meal.name}</p>
                            {meal.time && <span className="text-xs text-zinc-600 shrink-0">{meal.time}</span>}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{meal.foods}</p>
                          {meal.calories && <span className="text-xs text-orange-400/70 mt-0.5 block">{meal.calories} kcal</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800/60 border border-white/5 rounded-xl px-3 py-2.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Cargando...</p>
      </div>
    </div>
  );
}
