"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Stats {
  totalUsers: number; totalTrainers: number; totalClients: number;
  totalRoutines: number; completedExercises: number; newUsersLast30: number;
}
interface TrainerRow {
  id: string; bio: string | null; specialty: string | null;
  user: { id: string; name: string; email: string; createdAt: string };
  _count: { clients: number };
}
interface UserRow {
  id: string; name: string; email: string; role: "ADMIN" | "TRAINER" | "CLIENT"; createdAt: string;
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN:   "text-red-400 bg-red-500/10 border-red-500/20",
  TRAINER: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  CLIENT:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
};
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin", TRAINER: "Entrenador", CLIENT: "Cliente",
};

const STAT_CARDS = [
  { key: "totalTrainers",      label: "Entrenadores",      sub: "registrados",      from: "from-orange-600", to: "to-red-600",    shadow: "shadow-orange-500/30" },
  { key: "totalClients",       label: "Clientes",          sub: "activos",          from: "from-amber-500",  to: "to-orange-500", shadow: "shadow-amber-500/30"  },
  { key: "totalRoutines",      label: "Rutinas",           sub: "creadas",          from: "from-red-700",    to: "to-orange-600", shadow: "shadow-red-500/30"    },
  { key: "completedExercises", label: "Ejercicios hechos", sub: "completados",      from: "from-orange-500", to: "to-yellow-500", shadow: "shadow-orange-500/30" },
  { key: "totalUsers",         label: "Usuarios totales",  sub: "en la plataforma", from: "from-zinc-700",   to: "to-zinc-600",   shadow: "shadow-zinc-500/20"   },
  { key: "newUsersLast30",     label: "Nuevos este mes",   sub: "últimos 30 días",  from: "from-amber-600",  to: "to-red-500",    shadow: "shadow-amber-500/30"  },
];

type Tab = "users" | "trainers";

export default function AdminDashboard() {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>("users");
  const [search,   setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "ADMIN" | "TRAINER" | "CLIENT">("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/trainers"),
      api.get("/admin/users"),
    ]).then(([s, t, u]) => {
      setStats(s.data.data);
      setTrainers(t.data.data);
      setUsers(u.data.data);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(userId: string) {
    setDeleting(userId);
    setPendingDelete(null);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } finally {
      setDeleting(null);
    }
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="animate-fade-in mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Panel de Administración</h1>
        <p className="text-zinc-500 text-sm mt-1">Gestión de usuarios y métricas de la plataforma</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {STAT_CARDS.map(({ key, label, sub, from, to, shadow }, i) => (
          <div key={key}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${from} ${to} p-4 sm:p-5 shadow-xl ${shadow} animate-slide-up`}
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
            <p className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-wider">{label}</p>
            <p className="text-3xl sm:text-4xl font-black text-white mt-1.5 tabular-nums">
              {stats?.[key as keyof Stats]?.toLocaleString("es-AR") ?? 0}
            </p>
            <p className="text-[10px] sm:text-xs text-white/50 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 border border-white/[0.05] rounded-xl p-1 w-fit mb-6">
        <TabBtn active={tab === "users"} onClick={() => setTab("users")}>
          Usuarios ({users.length})
        </TabBtn>
        <TabBtn active={tab === "trainers"} onClick={() => setTab("trainers")}>
          Entrenadores ({trainers.length})
        </TabBtn>
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="animate-slide-up-sm">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
              className="bg-zinc-900 border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-orange-500/40 transition-colors">
              <option value="">Todos los roles</option>
              <option value="ADMIN">Admin</option>
              <option value="TRAINER">Entrenadores</option>
              <option value="CLIENT">Clientes</option>
            </select>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-zinc-600 text-sm">
              No se encontraron usuarios.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-12 px-5 py-3 border-b border-white/[0.05] bg-zinc-800/30">
                  <div className="col-span-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Usuario</div>
                  <div className="col-span-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Rol</div>
                  <div className="col-span-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Registrado</div>
                  <div className="col-span-2 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acciones</div>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {filteredUsers.map((u, i) => (
                    <div key={u.id}
                      className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors animate-slide-up"
                      style={{ animationDelay: `${i * 30}ms` }}>
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{u.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_COLOR[u.role]}`}>
                          {ROLE_LABEL[u.role]}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <p className="text-xs text-zinc-500">
                          {new Date(u.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() => setPendingDelete({ id: u.id, name: u.name })}
                            disabled={deleting === u.id}
                            className="text-xs text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-red-500/5"
                          >
                            {deleting === u.id ? "..." : "Eliminar"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-zinc-900 border border-white/[0.06] rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${ROLE_COLOR[u.role]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <p className="text-xs text-zinc-600">
                        {new Date(u.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {u.role !== "ADMIN" && (
                        <button onClick={() => setPendingDelete({ id: u.id, name: u.name })} disabled={deleting === u.id}
                          className="text-xs text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-50">
                          {deleting === u.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`¿Eliminar a ${pendingDelete.name}?`}
          message="Esta acción no se puede deshacer. El usuario perderá acceso permanentemente a la plataforma."
          confirmLabel="Eliminar usuario"
          onConfirm={() => handleDelete(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Trainers tab */}
      {tab === "trainers" && (
        <div className="animate-slide-up-sm">
          {trainers.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-zinc-500 text-sm">
              No hay entrenadores registrados.
            </div>
          ) : (
            <>
              <div className="hidden sm:block bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-12 px-5 py-3 border-b border-white/[0.05] bg-zinc-800/30">
                  <div className="col-span-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Entrenador</div>
                  <div className="col-span-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Especialidad</div>
                  <div className="col-span-2 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Clientes</div>
                  <div className="col-span-1 text-xs font-bold text-zinc-500 uppercase tracking-wider">Alta</div>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {trainers.map((t, i) => (
                    <div key={t.id}
                      className="grid grid-cols-12 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors animate-slide-up"
                      style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {t.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{t.user.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{t.user.email}</p>
                        </div>
                      </div>
                      <div className="col-span-4">
                        {t.specialty
                          ? <p className="text-sm text-zinc-300 truncate">{t.specialty}</p>
                          : <p className="text-sm text-zinc-600 italic">Sin especialidad</p>}
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-sm">
                          {t._count.clients}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <p className="text-xs text-zinc-600">
                          {new Date(t.user.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile */}
              <div className="sm:hidden space-y-3">
                {trainers.map(t => (
                  <div key={t.id} className="bg-zinc-900 border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black shrink-0">
                        {t.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{t.user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{t.user.email}</p>
                      </div>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-sm shrink-0">
                        {t._count.clients}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">{t.specialty ?? <span className="italic text-zinc-700">Sin especialidad</span>}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
      }`}>
      {children}
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-800 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
}
