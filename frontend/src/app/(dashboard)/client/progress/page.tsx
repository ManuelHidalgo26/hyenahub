"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ErrorBanner } from "@/components/ErrorBanner";

interface WeekStat {
  weekStart: string;
  total: number;
  done: number;
  pct: number;
}

const W = 480;
const H = 160;
const PAD = { top: 16, right: 16, bottom: 32, left: 36 };

function BarChart({ data }: { data: WeekStat[] }) {
  if (!data.length) return null;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const gap = 6;
  const barW = Math.max(8, Math.floor((chartW - gap * (data.length - 1)) / data.length));
  const step = chartW / data.length;

  function formatWeek(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H + PAD.top + PAD.bottom}`} className="w-full" style={{ maxHeight: 200 }}>
      {[0, 25, 50, 75, 100].map(v => {
        const y = PAD.top + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end"
              fill="rgba(255,255,255,0.2)" fontSize={9}>{v}</text>
          </g>
        );
      })}

      {data.map((w, i) => {
        const x = PAD.left + i * step + (step - barW) / 2;
        const barH = Math.max(2, (w.pct / 100) * chartH);
        const y = PAD.top + chartH - barH;
        const done = w.pct === 100;
        return (
          <g key={w.weekStart}>
            <rect x={x} y={PAD.top} width={barW} height={chartH}
              rx={4} fill="rgba(255,255,255,0.03)" />
            <rect x={x} y={y} width={barW} height={barH}
              rx={4}
              fill={done ? "url(#grad-done)" : "url(#grad-prog)"}
              opacity={0.9}
            />
            {w.pct > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                fill={done ? "#34d399" : "#fb923c"} fontSize={8} fontWeight="bold">
                {w.pct}%
              </text>
            )}
            <text x={x + barW / 2} y={H + PAD.top + 16} textAnchor="middle"
              fill="rgba(255,255,255,0.25)" fontSize={8}>
              {formatWeek(w.weekStart)}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="grad-prog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.7} />
        </linearGradient>
        <linearGradient id="grad-done" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" stopOpacity={0.7} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ProgressPage() {
  const [data,       setData]       = useState<WeekStat[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState("");
  const [resetting,  setResetting]  = useState<string | null>(null);

  function load() {
    setLoading(true); setFetchErr("");
    api.get("/routines/my/progress")
      .then(r => setData(r.data.data))
      .catch((e: Error) => setFetchErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleResetWeek(weekStart: string) {
    const label = new Date(weekStart).toLocaleDateString("es-AR", { day: "numeric", month: "long" });
    if (!confirm(`¿Reiniciar el progreso de la semana del ${label}? Podrás volver a marcar los ejercicios desde cero.`)) return;
    setResetting(weekStart);
    try {
      await api.delete(`/routines/my/logs?weekOf=${weekStart}`);
      setData(prev => prev.map(w => w.weekStart === weekStart ? { ...w, done: 0, pct: 0 } : w));
    } catch {
      alert("No se pudo reiniciar el progreso. Intentá de nuevo.");
    } finally {
      setResetting(null);
    }
  }

  if (fetchErr) return <ErrorBanner message={fetchErr} onRetry={load} />;

  const completed  = data.filter(w => w.pct === 100).length;
  const avgPct     = data.length ? Math.round(data.reduce((s, w) => s + w.pct, 0) / data.length) : 0;
  const streak     = (() => {
    let s = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].pct === 100) s++; else break;
    }
    return s;
  })();

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">

      <div className="animate-fade-in mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Mi progreso</h1>
        <p className="text-zinc-500 text-sm mt-1">Historial de las últimas semanas</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-800 rounded-2xl" />)}
          </div>
          <div className="h-48 bg-zinc-800 rounded-2xl" />
        </div>
      ) : data.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-14 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/15 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-orange-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-white font-semibold text-sm">Todavía no hay datos de progreso</p>
          <p className="text-zinc-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            Completá tus primeras semanas de entrenamiento para ver tu historial aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-5 animate-slide-up">

          <div className="grid grid-cols-3 gap-3">
            <StatCard value={`${data.length}`} label="Semanas" color="text-zinc-200" bg="bg-zinc-900" />
            <StatCard value={`${completed}`} label="Completadas" color="text-emerald-400" bg="bg-emerald-500/8" />
            <StatCard value={`${avgPct}%`} label="Promedio" color="text-orange-400" bg="bg-orange-500/8" />
          </div>

          {streak > 0 && (
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="text-3xl">🔥</div>
              <div>
                <p className="text-white font-bold">{streak} semana{streak > 1 ? "s" : ""} seguida{streak > 1 ? "s" : ""}</p>
                <p className="text-zinc-400 text-xs mt-0.5">Racha de semanas completadas al 100%</p>
              </div>
            </div>
          )}

          <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl p-5">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Cumplimiento semanal</p>
            <BarChart data={data} />
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-600">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500/80 inline-block" /> En progreso</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 inline-block" /> Completada</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.04]">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Detalle por semana</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[...data].reverse().map(w => (
                <div key={w.weekStart} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">
                      Semana del {new Date(w.weekStart).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{w.done} de {w.total} ejercicios</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${w.pct}%`,
                          background: w.pct === 100
                            ? "linear-gradient(90deg,#10b981,#34d399)"
                            : "linear-gradient(90deg,#f97316,#fbbf24)"
                        }} />
                    </div>
                    <span className={`text-sm font-bold tabular-nums w-10 text-right ${w.pct === 100 ? "text-emerald-400" : "text-zinc-300"}`}>
                      {w.pct}%
                    </span>
                    {w.pct === 100 && <span className="text-xs">✓</span>}
                    {w.done > 0 && (
                      <button
                        onClick={() => handleResetWeek(w.weekStart)}
                        disabled={resetting === w.weekStart}
                        title="Reiniciar progreso de esta semana"
                        className="text-xs text-red-500/50 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                      >
                        {resetting === w.weekStart ? "..." : "↺"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color, bg }: { value: string; label: string; color: string; bg: string }) {
  return (
    <div className={`${bg} border border-white/5 rounded-2xl p-4 text-center`}>
      <p className={`text-2xl font-black ${color} tabular-nums`}>{value}</p>
      <p className="text-xs text-zinc-600 mt-1">{label}</p>
    </div>
  );
}
