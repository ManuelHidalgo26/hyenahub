"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
type Role = "TRAINER" | "CLIENT";

interface TrainerOption {
  id: string;       // Trainer profile id
  name: string;
  email: string;
  avatar: string | null;
  specialty: string | null;
  bio: string | null;
}

const API = "/api";

export default function RegisterPage() {
  const router = useRouter();

  /* ── Step state ─────────────────────────────────────────────── */
  const [step, setStep] = useState<1 | 2>(1); // 1 = role selection, 2 = form
  const [role, setRole] = useState<Role | null>(null);

  /* ── Form fields ────────────────────────────────────────────── */
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [trainerId, setTrainerId] = useState("");

  /* ── Trainers list (for CLIENT) ─────────────────────────────── */
  const [trainers,       setTrainers]       = useState<TrainerOption[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);

  /* ── UI state ───────────────────────────────────────────────── */
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  /* ── Fetch trainers when CLIENT is selected ─────────────────── */
  useEffect(() => {
    if (role !== "CLIENT") return;
    setLoadingTrainers(true);
    fetch(`${API}/auth/trainers`)
      .then(r => r.json())
      .then(d => { if (d.success) setTrainers(d.data); })
      .catch(() => {})
      .finally(() => setLoadingTrainers(false));
  }, [role]);

  function selectRole(r: Role) {
    setRole(r);
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (role === "CLIENT" && !trainerId) {
      setError("Por favor seleccioná un entrenador.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("La contraseña debe incluir al menos una letra mayúscula.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("La contraseña debe incluir al menos un número.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { name, email, password, role: role! };
      if (role === "CLIENT") body.trainerId = trainerId;

      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        const msg = typeof json.error === "string"
          ? json.error
          : json.error?.fieldErrors
            ? Object.values(json.error.fieldErrors).flat().join(". ")
            : "Error al registrarse";
        setError(msg);
        setLoading(false);
        return;
      }

      // Auto-login after successful registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Cuenta creada, pero no se pudo iniciar sesión automáticamente. Intentá desde la pantalla de login.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Error de conexión. Verificá que el servidor esté activo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden px-4 py-10">

      {/* Orbs */}
      <div className="absolute top-[-15%] left-[-5%]  w-[500px] h-[500px] bg-orange-600/8  rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] bg-amber-600/8  rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm sm:max-w-md animate-slide-up">
        <div className="card-dark rounded-3xl p-8 shadow-2xl shadow-black/70">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/35 mb-4 glow-orange">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Crear cuenta</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              {step === 1 ? "¿Cómo vas a usar TrainerHub?" : role === "TRAINER" ? "Registrate como entrenador" : "Registrate como cliente"}
            </p>
          </div>

          {/* ── STEP 1: Role selection ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <RoleCard
                onClick={() => selectRole("TRAINER")}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                }
                title="Soy entrenador"
                description="Gestioná clientes, creá rutinas y monitoreá el progreso"
                gradient="from-orange-500 to-amber-500"
                glow="shadow-orange-500/20"
              />
              <RoleCard
                onClick={() => selectRole("CLIENT")}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                title="Soy cliente"
                description="Seguí tu rutina personalizada y alcanzá tus objetivos"
                gradient="from-amber-500 to-orange-600"
                glow="shadow-amber-500/20"
              />
            </div>
          )}

          {/* ── STEP 2: Registration form ──────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Back button */}
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Cambiar rol
              </button>

              {/* Role badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-1
                ${role === "TRAINER"
                  ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                  : "bg-amber-500/15  text-amber-400  border border-amber-500/20"
                }`}>
                {role === "TRAINER" ? "🏅 Entrenador" : "⚡ Cliente"}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre completo</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Juan Pérez" className="input-dark" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" className="input-dark" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Contraseña</label>
                <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mín. 8 caracteres, 1 mayúscula y 1 número" className="input-dark" />
              </div>

              {/* Trainer selector — only for CLIENT */}
              {role === "CLIENT" && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Elegí tu entrenador
                  </label>
                  {loadingTrainers ? (
                    <div className="flex items-center gap-2 text-zinc-600 text-sm py-2">
                      <span className="w-4 h-4 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
                      Cargando entrenadores...
                    </div>
                  ) : trainers.length === 0 ? (
                    <p className="text-xs text-zinc-600 py-2">No hay entrenadores disponibles aún.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {trainers.map(t => (
                        <button key={t.id} type="button"
                          onClick={() => setTrainerId(t.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 border
                            ${trainerId === t.id
                              ? "bg-orange-500/10 border-orange-500/30 text-white"
                              : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-white/10 hover:text-white"
                            }`}>
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                            {t.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-black">
                                {t.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{t.name}</p>
                            {t.specialty && <p className="text-xs text-zinc-600 truncate">{t.specialty}</p>}
                          </div>
                          {trainerId === t.id && (
                            <svg className="w-4 h-4 text-orange-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando cuenta...</>
                  : "Crear cuenta →"
                }
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-zinc-700">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-orange-500 hover:text-orange-400 font-semibold transition-colors">
              Iniciá sesión
            </Link>
          </p>
        </div>
        <p className="text-center mt-5 text-xs text-zinc-700">TrainerHub · Entrenamiento personalizado</p>
      </div>
    </div>
  );
}

/* ─── Role card ──────────────────────────────────────────────────────────────── */
function RoleCard({
  onClick, icon, title, description, gradient, glow
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  glow: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/50 border border-white/[0.06] hover:border-orange-500/20 hover:bg-zinc-800 transition-all duration-200 text-left">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shrink-0 shadow-lg ${glow} group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <div>
        <p className="font-bold text-white text-sm">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <svg className="w-4 h-4 text-zinc-700 group-hover:text-orange-500 ml-auto shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
