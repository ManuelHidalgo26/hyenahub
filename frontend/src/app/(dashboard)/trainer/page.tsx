"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import api from "@/lib/api";

interface ExerciseSummary { id: string; completed: boolean; }
interface RoutineSummary  { id: string; weekStart: string; exercises: ExerciseSummary[]; }
interface ClientCard {
  id: string; goal: string; experience: string; equipment: string;
  user: { name: string; email: string };
  routines: RoutineSummary[];
}
interface Stats { totalClients: number; thisWeekRoutines: number; completedExercisesThisWeek: number; }

const EXP: Record<string, { label: string; dot: string }> = {
  beginner:     { label: "Principiante", dot: "bg-emerald-400" },
  intermediate: { label: "Intermedio",   dot: "bg-amber-400"   },
  advanced:     { label: "Avanzado",     dot: "bg-red-400"     },
};
const EQ: Record<string, string> = { none: "Sin equipo", home: "Casa", gym: "Gym", full: "Completo" };

const STATS = [
  { key: "totalClients",                label: "Clientes activos",      sub: "total registrados",    from: "from-orange-600", to: "to-red-600",    shadow: "shadow-orange-500/30" },
  { key: "thisWeekRoutines",            label: "Rutinas esta semana",   sub: "asignadas por vos",    from: "from-amber-500",  to: "to-orange-500", shadow: "shadow-amber-500/30"  },
  { key: "completedExercisesThisWeek", label: "Ejercicios completados", sub: "por tus clientes",     from: "from-red-700",    to: "to-orange-600", shadow: "shadow-red-500/30"    },
];

export default function TrainerDashboard() {
  const { data: session } = useSession();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/trainer/dashboard"), api.get("/trainer/clients")])
      .then(([s, c]) => { setStats(s.data.data); setClients(c.data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader text="Cargando dashboard..." />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in">
        <p className="text-zinc-500 text-sm font-medium">{greeting} 👋</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight">{session?.user?.name}</h1>
        <p className="text-zinc-600 text-sm mt-1">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {STATS.map(({ key, label, sub, from, to, shadow }, i) => (
          <div key={key}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${from} ${to} p-6 shadow-xl ${shadow} animate-slide-up`}
            style={{ animationDelay: `${i * 80}ms` }}>
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-4 -right-2 w-14 h-14 rounded-full bg-black/10 pointer-events-none" />
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest relative">{label}</p>
            <p className="text-5xl font-black text-white mt-2 tabular-nums relative">{stats?.[key as keyof Stats] ?? 0}</p>
            <p className="text-xs text-white/50 mt-1 relative">{sub}</p>
          </div>
        ))}
      </div>

      {/* Client grid */}
      <div className="mt-8 sm:mt-10 animate-fade-in" style={{ animationDelay: "240ms" }}>
        <h2 className="text-lg font-black text-white mb-4 sm:mb-5">
          Tus clientes <span className="text-zinc-600 font-normal text-sm">({clients.length})</span>
        </h2>

        {clients.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-zinc-600 text-sm">
            No tenés clientes asignados todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client, i) => {
              const routine = client.routines[0];
              const total   = routine?.exercises.length ?? 0;
              const done    = routine?.exercises.filter(e => e.completed).length ?? 0;
              const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
              const exp     = EXP[client.experience] ?? { label: client.experience, dot: "bg-zinc-500" };

              return (
                <Link key={client.id} href={`/trainer/clients/${client.id}`}>
                  <div className="group relative bg-zinc-900 border border-white/[0.06] hover:border-orange-500/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(249,115,22,0.12)] cursor-pointer overflow-hidden animate-slide-up"
                    style={{ animationDelay: `${(i + 3) * 60}ms` }}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-sm">
                          {client.user.name.charAt(0).toUpperCase()}
                        </div>
                        {pct === 100 && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                            <svg className="w-2 h-2 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate text-sm">{client.user.name}</p>
                        <p className="text-xs text-zinc-600 truncate">{client.user.email}</p>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-500 line-clamp-2 mb-4 leading-relaxed">{client.goal}</p>

                    {total > 0 ? (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-600">Progreso semana</span>
                          <span className={`font-bold ${pct === 100 ? "text-emerald-400" : "text-zinc-300"}`}>{done}/{total}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: pct === 100 ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#f97316,#f59e0b)" }} />
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 text-xs text-zinc-700 italic">Sin rutina esta semana</div>
                    )}

                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/60 px-2.5 py-1 rounded-full">
                        <span className={`w-1.5 h-1.5 rounded-full ${exp.dot}`} /> {exp.label}
                      </span>
                      <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2.5 py-1 rounded-full">
                        {EQ[client.equipment] ?? client.equipment}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Loader({ text }: { text: string }) {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-zinc-600 text-sm">{text}</p>
      </div>
    </div>
  );
}
