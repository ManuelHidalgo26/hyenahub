"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import { useNotifications } from "@/components/NotificationProvider";
import { ErrorBanner } from "@/components/ErrorBanner";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface Exercise {
  id: string; name: string; sets: number; reps: number;
  weight: number | null; notes: string | null; clientNote: string | null;
  completed: boolean; order: number;
}
interface WeeklyFeedback {
  id: string; rating: number; comment: string | null;
}
interface Routine {
  id: string; weekStart: string; createdAt: string; notes: string | null; exercises: Exercise[];
  client?: { trainerId: string };
  feedback?: WeeklyFeedback | null;
}
interface TrainerVideo {
  id: string; title: string; videoUrl: string; exercise: string | null;
}

/* ─── Progress Ring ──────────────────────────────────────────────────────────── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const done = pct === 100;
  return (
    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
        stroke="url(#ring-grad)"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={done ? "#10b981" : "#f97316"} />
          <stop offset="100%" stopColor={done ? "#34d399" : "#fbbf24"} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Exercise Row ───────────────────────────────────────────────────────────── */
function ExerciseRow({ ex, onToggle, onNote, readonly, videoUrl, videoTitle }: {
  ex: Exercise;
  onToggle?: (id: string) => Promise<void>;
  onNote?: (id: string, note: string) => Promise<void>;
  readonly?: boolean;
  videoUrl?: string;
  videoTitle?: string;
}) {
  const [busy,       setBusy]       = useState(false);
  const [showNote,   setShowNote]   = useState(false);
  const [noteVal,    setNoteVal]    = useState(ex.clientNote ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);

  // Keep noteVal in sync if parent updates ex.clientNote
  useEffect(() => { setNoteVal(ex.clientNote ?? ""); }, [ex.clientNote]);

  async function handleToggle(e: React.MouseEvent) {
    if (readonly || !onToggle) return;
    e.stopPropagation();
    setBusy(true);
    await onToggle(ex.id);
    setBusy(false);
  }

  async function handleNoteSubmit() {
    if (!onNote) return;
    setSavingNote(true);
    await onNote(ex.id, noteVal);
    setSavingNote(false);
    setShowNote(false);
  }

  return (
    <div className={`${ex.completed ? "bg-emerald-500/5" : ""}`}>
      {/* Main row */}
      <div
        onClick={!readonly ? handleToggle : undefined}
        className={`group flex items-center gap-3 px-5 py-3.5 transition-all duration-200
          ${readonly ? "cursor-default" : "cursor-pointer select-none hover:bg-white/[0.02]"}`}
      >
        {/* Checkbox */}
        {!readonly ? (
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200
            ${busy ? "opacity-50 scale-90" : ""}
            ${ex.completed
              ? "bg-gradient-to-br from-orange-500 to-amber-500 border-transparent shadow-lg shadow-orange-500/30"
              : "border-zinc-600 group-hover:border-orange-500/60"
            }`}
          >
            {ex.completed && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        ) : (
          <div className={`w-2 h-2 rounded-full shrink-0 ${ex.completed ? "bg-emerald-400" : "bg-zinc-700"}`} />
        )}

        {/* Name */}
        <span className={`flex-1 text-sm font-medium transition-all duration-200
          ${ex.completed ? "text-zinc-600 line-through decoration-zinc-700" : "text-zinc-200"}`}>
          {ex.name}
        </span>

        {/* Sets × reps */}
        <div className="text-right shrink-0">
          <span className={`text-xs tabular-nums font-semibold ${ex.completed ? "text-zinc-700" : "text-zinc-400"}`}>
            {ex.sets}×{ex.reps}
          </span>
          {ex.weight && (
            <span className="text-xs text-zinc-700 ml-1">· {ex.weight}kg</span>
          )}
        </div>

        {ex.completed && !readonly && (
          <span className="text-xs text-emerald-500 font-bold shrink-0">✓</span>
        )}

        {/* Note icon button */}
        {!readonly && (
          <button
            onClick={e => { e.stopPropagation(); setShowNote(v => !v); }}
            title={ex.clientNote ? "Ver / editar nota" : "Agregar nota"}
            className={`shrink-0 p-1.5 rounded-lg transition-all duration-200
              ${ex.clientNote
                ? "text-yellow-400 bg-yellow-500/10"
                : "text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-zinc-400 hover:bg-zinc-800"
              }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {/* Video button — visible when trainer has a related video */}
        {videoUrl && (
          <button
            onClick={e => { e.stopPropagation(); setShowVideo(true); }}
            title="Ver video del ejercicio"
            className="shrink-0 p-1.5 rounded-lg text-orange-500/70 bg-orange-500/10 hover:text-orange-400 hover:bg-orange-500/20 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </button>
        )}
      </div>

      {/* Saved note preview (click to edit) */}
      {ex.clientNote && !showNote && (
        <div
          className={`px-5 pb-3 -mt-1 ${!readonly ? "cursor-pointer" : ""}`}
          onClick={!readonly ? () => setShowNote(true) : undefined}
        >
          <p className="text-xs text-yellow-500/60 italic leading-relaxed">
            📝 {ex.clientNote}
          </p>
        </div>
      )}

      {/* Inline note editor */}
      {showNote && !readonly && (
        <div className="px-5 pb-4 -mt-1" onClick={e => e.stopPropagation()}>
          <textarea
            value={noteVal}
            onChange={e => setNoteVal(e.target.value)}
            placeholder="Ej: bajé el peso a 60kg, sentí molestia en el hombro..."
            rows={2}
            autoFocus
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleNoteSubmit(); }}
            className="w-full bg-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 resize-none border border-white/[0.06] focus:outline-none focus:border-orange-500/40 placeholder:text-zinc-700"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={handleNoteSubmit}
              disabled={savingNote}
              className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-lg hover:bg-orange-500/25 transition-all disabled:opacity-50"
            >
              {savingNote ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => { setNoteVal(ex.clientNote ?? ""); setShowNote(false); }}
              className="text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Video modal */}
      {showVideo && videoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}>
          <div className="w-full max-w-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Video del ejercicio</p>
                  <h3 className="font-bold text-white text-sm">{videoTitle ?? ex.name}</h3>
                </div>
                <button onClick={() => setShowVideo(false)}
                  className="text-zinc-500 hover:text-white text-2xl leading-none transition-colors">×</button>
              </div>
              <div className="p-4">
                <VideoPlayer url={videoUrl} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ url }: { url: string }) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) {
    return (
      <iframe src={`https://www.youtube.com/embed/${m[1]}`}
        className="w-full aspect-video rounded-xl"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        allowFullScreen />
    );
  }
  return <video src={url} controls className="w-full aspect-video rounded-xl bg-zinc-950" />;
}

/* ─── Routine Card ────────────────────────────────────────────────────────────── */
function RoutineCard({ routine, onToggle, onNote, readonly, clientName, videoMap, onFeedbackSaved }: {
  routine: Routine;
  onToggle?: (id: string) => Promise<void>;
  onNote?: (id: string, note: string) => Promise<void>;
  readonly?: boolean;
  clientName?: string;
  videoMap?: Record<string, TrainerVideo>;
  onFeedbackSaved?: (routineId: string, fb: WeeklyFeedback) => void;
}) {
  const done  = routine.exercises.filter(e => e.completed).length;
  const total = routine.exercises.length;
  const p     = total > 0 ? Math.round((done / total) * 100) : 0;

  function formatDate(s: string) {
    const d = new Date(s);
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Progress line */}
      <div className="h-0.5 bg-zinc-800">
        <div className="h-full transition-all duration-700"
          style={{ width: `${p}%`, background: p === 100 ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#f97316,#fbbf24)" }} />
      </div>

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between gap-2">
        <div>
          <span className="text-xs text-zinc-500 font-medium">Actualizado el {formatDate(routine.createdAt)}</span>
          {routine.notes && <p className="text-sm text-zinc-300 mt-1">{routine.notes}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold ${p === 100 ? "text-emerald-400" : "text-zinc-300"}`}>
              {p === 100 ? "¡Completado! 💪" : `${done}/${total}`}
            </p>
            <p className="text-xs text-zinc-600">{p}%</p>
          </div>
          {/* Download PDF button */}
          <button
            onClick={async () => { const { downloadRoutinePDF } = await import("@/lib/pdf"); downloadRoutinePDF(routine, clientName); }}
            title="Descargar como PDF"
            className="p-2 rounded-xl bg-zinc-800 text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all border border-white/[0.04]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Exercises */}
      <div className="divide-y divide-white/[0.04]">
        {routine.exercises.map(ex => {
          const vid = videoMap?.[ex.name.toLowerCase()];
          return (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              onToggle={onToggle}
              onNote={onNote}
              readonly={readonly}
              videoUrl={vid?.videoUrl}
              videoTitle={vid?.title}
            />
          );
        })}
      </div>

      {/* Weekly rating — shown on current (non-readonly) routine */}
      {!readonly && onFeedbackSaved && (
        <WeeklyRating
          routineId={routine.id}
          initial={routine.feedback}
          onSaved={fb => onFeedbackSaved(routine.id, fb)}
        />
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function ClientDashboard() {
  const { data: session } = useSession();
  const { addToast } = useNotifications();
  const [routines,  setRoutines]  = useState<Routine[]>([]);
  const [videoMap,  setVideoMap]  = useState<Record<string, TrainerVideo>>({});
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState("");
  const sessionFiredRef = useRef(false);

  function load() {
    setLoading(true); setFetchErr("");
    Promise.allSettled([
      api.get("/routines/my"),
      api.get("/profile/my-trainer"),
    ]).then(([routinesRes, trainerRes]) => {
      if (routinesRes.status === "fulfilled") {
        setRoutines(routinesRes.value.data.data);
      } else {
        setFetchErr((routinesRes.reason as Error).message);
      }
      if (trainerRes.status === "fulfilled") {
        const vids: TrainerVideo[] = trainerRes.value.data.data?.videos ?? [];
        const map: Record<string, TrainerVideo> = {};
        vids.forEach(v => { if (v.exercise) map[v.exercise.toLowerCase()] = v; });
        setVideoMap(map);
      }
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(exerciseId: string) {
    const res = await api.patch(`/routines/exercises/${exerciseId}/complete`);
    const updated: Exercise = res.data.data;

    setRoutines(prev => {
      const next = prev.map(r => ({
        ...r,
        exercises: r.exercises.map(ex => ex.id === updated.id ? { ...ex, ...updated } : ex),
      }));

      const current = next[0];
      if (current) {
        const allDone = current.exercises.every(e => e.completed);

        if (allDone && !sessionFiredRef.current) {
          sessionFiredRef.current = true;
          addToast({
            type: "success",
            title: "¡Semana completada! 🏆",
            message: "Completaste todos los ejercicios de esta semana. ¡Sos una bestia!",
          });
        }
        if (!allDone) sessionFiredRef.current = false;
      }
      return next;
    });

  }

  function handleFeedbackSaved(routineId: string, fb: WeeklyFeedback) {
    setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, feedback: fb } : r));
  }

  async function handleNote(exerciseId: string, note: string) {
    const res = await api.patch(`/routines/exercises/${exerciseId}/note`, { note });
    const updated: Exercise = res.data.data;
    setRoutines(prev =>
      prev.map(r => ({
        ...r,
        exercises: r.exercises.map(ex => ex.id === updated.id ? { ...ex, clientNote: updated.clientNote } : ex),
      }))
    );
    addToast({
      type: note.trim() ? "success" : "info",
      title: note.trim() ? "Nota guardada" : "Nota eliminada",
      message: note.trim() ? "Tu nota quedó registrada en el ejercicio." : "La nota fue borrada correctamente.",
    });
  }

  const current = routines[0] ?? null;
  const done  = current?.exercises.filter(e => e.completed).length ?? 0;
  const total = current?.exercises.length ?? 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) return <LoadingScreen />;
  if (fetchErr) return <ErrorBanner message={fetchErr} onRetry={load} />;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">

      {/* Hero / motivation banner */}
      <div className="animate-slide-up">
        {current ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-orange-950/20 to-zinc-900 border border-orange-500/10 rounded-3xl p-6 mb-8">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-500/8 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-6 relative">
              <div className="relative shrink-0">
                <ProgressRing pct={pct} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-black ${pct === 100 ? "text-emerald-400" : "text-white"}`}>{pct}%</span>
                </div>
              </div>
              <div>
                <p className="text-zinc-400 text-sm">
                  Buenas, <span className="text-white font-semibold">{session?.user?.name?.split(" ")[0]}</span> 👋
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                  {pct === 100 ? "¡Semana completada!" : pct >= 66 ? "¡Vas muy bien!" : pct > 0 ? "¡A entrenar!" : "¡Comenzá hoy!"}
                </h1>
                <p className="text-zinc-400 text-sm mt-1">{done} de {total} ejercicios completados</p>
                {pct === 100 && (
                  <p className="text-emerald-400 text-xs mt-2 font-medium">¡Completaste todos los ejercicios de la semana! 🏆</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <p className="text-zinc-400 text-sm">Bienvenido/a</p>
            <h1 className="text-3xl font-black text-white mt-0.5 tracking-tight">{session?.user?.name}</h1>
          </div>
        )}
      </div>

      {/* Rutina */}
      <div className="animate-slide-up-sm">
        {current
          ? <RoutineCard
              routine={current}
              onToggle={handleToggle}
              onNote={handleNote}
              clientName={session?.user?.name}
              videoMap={videoMap}
              onFeedbackSaved={handleFeedbackSaved}
            />
          : <EmptyState message="Sin rutina asignada" sub="Tu entrenador todavía no asignó ejercicios. ¡Pronto llegará!" />
        }
      </div>

    </div>
  );
}

/* ─── Weekly Rating ──────────────────────────────────────────────────────────── */
function WeeklyRating({ routineId, initial, onSaved }: {
  routineId: string;
  initial?: WeeklyFeedback | null;
  onSaved: (fb: WeeklyFeedback) => void;
}) {
  const [rating,  setRating]  = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(!!initial);

  const stars = [1, 2, 3, 4, 5];
  const labels: Record<number, string> = {
    1: "Muy difícil 😓", 2: "Difícil 😤", 3: "Bien 💪",
    4: "Muy bien 🔥", 5: "Excelente 🏆",
  };

  async function handleSave() {
    if (!rating) return;
    setSaving(true);
    try {
      const res = await api.post(`/feedback/${routineId}`, { rating, comment: comment || undefined });
      const fb: WeeklyFeedback = res.data.data;
      setSaved(true); setOpen(false); onSaved(fb);
    } finally {
      setSaving(false);
    }
  }

  if (!open && saved && initial) {
    return (
      <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Tu valoración:</span>
          <span className="flex gap-0.5">
            {stars.map(s => (
              <svg key={s} className={`w-3.5 h-3.5 ${s <= initial.rating ? "text-orange-400" : "text-zinc-700"}`}
                fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </span>
          {initial.comment && <span className="text-xs text-zinc-600 italic truncate max-w-[140px]">&ldquo;{initial.comment}&rdquo;</span>}
        </div>
        <button onClick={() => setOpen(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
          Editar
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="px-5 py-3 border-t border-white/[0.04]">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-xs text-zinc-600 hover:text-orange-400 transition-colors group"
        >
          <svg className="w-3.5 h-3.5 group-hover:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Valorar esta semana
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-white/[0.04] bg-zinc-950/40 space-y-3" onClick={e => e.stopPropagation()}>
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">¿Cómo fue tu semana?</p>

      {/* Stars */}
      <div className="flex items-center gap-1.5">
        {stars.map(s => (
          <button key={s} type="button" onClick={() => setRating(s)}
            className="transition-transform hover:scale-110 active:scale-95">
            <svg className={`w-7 h-7 transition-colors ${s <= rating ? "text-orange-400" : "text-zinc-700 hover:text-zinc-500"}`}
              fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-xs text-zinc-400 animate-fade-in">{labels[rating]}</span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
        placeholder="Comentario opcional (ej: me costó la sentadilla, mucho volumen...)"
        className="w-full bg-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 resize-none border border-white/[0.06] focus:outline-none focus:border-orange-500/40 placeholder:text-zinc-700"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!rating || saving}
          className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-lg hover:bg-orange-500/25 transition-all disabled:opacity-40 font-medium"
        >
          {saving ? "Guardando..." : "Guardar valoración"}
        </button>
        <button onClick={() => { setOpen(false); setRating(initial?.rating ?? 0); setComment(initial?.comment ?? ""); }}
          className="text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1 transition-all">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/15 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-orange-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M4 9h4v6H4V9M16 9h4v6h-4V9" />
        </svg>
      </div>
      <p className="text-white font-semibold text-sm">{message}</p>
      {sub && <p className="text-zinc-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">{sub}</p>}
      <div className="mt-6 flex items-center gap-2 justify-center text-xs text-zinc-600">
        <svg className="w-3.5 h-3.5 text-orange-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Te notificaremos cuando tu entrenador asigne contenido
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="rounded-2xl bg-zinc-900 border border-white/[0.06] p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-28 h-28 rounded-full bg-zinc-800 shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-zinc-800 rounded-full w-1/3" />
            <div className="h-7 bg-zinc-800 rounded-full w-2/3" />
            <div className="h-3 bg-zinc-800 rounded-full w-1/2" />
          </div>
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="h-9 w-28 bg-zinc-800 rounded-lg" />
        <div className="h-9 w-28 bg-zinc-800 rounded-lg" />
      </div>
      {/* Card skeleton */}
      <div className="rounded-2xl bg-zinc-900 border border-white/[0.06] p-5 space-y-4">
        <div className="h-4 bg-zinc-800 rounded-full w-1/4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 py-3 border-t border-white/[0.04]">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-zinc-800 rounded-full w-1/2" />
              <div className="h-2.5 bg-zinc-800 rounded-full w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
