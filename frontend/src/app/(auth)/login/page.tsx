"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"), password: form.get("password"), redirect: false,
    });
    if (result?.error) { setError("Email o contraseña incorrectos"); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden px-4">

      {/* Orbs */}
      <div className="absolute top-[-15%] left-[-5%]  w-[500px] h-[500px] bg-orange-600/8  rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] bg-amber-600/8  rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-500/4 rounded-full blur-2xl pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="card-dark rounded-3xl p-8 shadow-2xl shadow-black/70">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/35 mb-4 glow-orange">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 9 L5 4 L10 7" />
                <path d="M14 7 L19 4 L17 9" />
                <path d="M10 7 Q5 8 4.5 13 Q4 18 7 20 Q9.5 22 12 22 Q14.5 22 17 20 Q20 18 19.5 13 Q19 8 14 7 Q12 6 10 7 Z" />
                <circle cx="9.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="14.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
                <ellipse cx="12" cy="16.5" rx="2.5" ry="1.5" />
                <circle cx="12" cy="16" r="0.7" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">HyenaHub</h1>
            <p className="mt-1.5 text-sm text-zinc-400">Tu plataforma de entrenamiento profesional</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Email</label>
              <input name="email" type="email" required placeholder="tu@email.com" className="input-dark" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Contraseña</label>
              <input name="password" type="password" required placeholder="••••••••" className="input-dark" />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Iniciando...</>
              ) : "Iniciar sesión →"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-700">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="text-orange-500 hover:text-orange-400 font-semibold transition-colors">
              Registrate acá
            </Link>
          </p>
        </div>
        <p className="text-center mt-5 text-xs text-zinc-700">HyenaHub · Entrenamiento personalizado</p>
      </div>
    </div>
  );
}
