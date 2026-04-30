"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import { useNotifications } from "@/components/NotificationProvider";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { addToast } = useNotifications();
  const name  = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";

  // ── Avatar state ──────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; data: { avatar?: string } }>("/profile").then(r => {
      if (r.data?.data?.avatar) setAvatarUrl(r.data.data.avatar);
    }).catch(() => {});
  }, []);

  async function handleAvatarSave(e: React.FormEvent) {
    e.preventDefault();
    setAvatarSaving(true);
    try {
      await api.patch("/profile/avatar", { avatar: avatarUrl });
      // Sync to NextAuth session — base64 is skipped to avoid cookie size limit (Vercel 494)
      await updateSession({ avatar: avatarUrl.startsWith("data:") ? undefined : (avatarUrl || null) });
      addToast({ type: "success", title: "Foto actualizada", message: "Tu foto de perfil fue guardada correctamente." });
    } catch {
      addToast({ type: "warning", title: "Error", message: "No se pudo actualizar la foto. Verificá el formato." });
    } finally {
      setAvatarSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
        setUploading(false);
      };
      img.onerror = () => setUploading(false);
      img.src = dataUrl;
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── Name state ────────────────────────────────────────────
  const [nameValue, setNameValue]   = useState(name);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError,  setNameError]  = useState("");

  useEffect(() => { setNameValue(name); }, [name]);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nameValue.trim() || nameValue.trim() === name) return;
    setNameSaving(true);
    setNameError("");
    try {
      await api.patch("/profile/name", { name: nameValue.trim() });
      await updateSession({ name: nameValue.trim() });
      addToast({ type: "success", title: "Nombre actualizado", message: "Tu nombre fue guardado correctamente." });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo guardar el nombre.";
      setNameError(msg);
    } finally {
      setNameSaving(false);
    }
  }

  // ── Password state ────────────────────────────────────────
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd,     setNewPwd]       = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [pwdSaving,  setPwdSaving]    = useState(false);
  const [pwdError,   setPwdError]     = useState("");
  const [pwdSuccess, setPwdSuccess]   = useState(false);

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess(false);

    if (newPwd.length < 8 || !/[A-Z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      setPwdError("La nueva contraseña debe tener al menos 8 caracteres, una mayúscula y un número.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Las contraseñas no coinciden.");
      return;
    }

    setPwdSaving(true);
    try {
      await api.post("/profile/change-password", { currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 4000);
      addToast({ type: "success", title: "Contraseña actualizada", message: "Tu contraseña fue cambiada correctamente." });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo cambiar la contraseña.";
      setPwdError(msg);
    } finally {
      setPwdSaving(false);
    }
  }

  const roleLabel = session?.user?.role === "TRAINER" ? "Entrenador" : session?.user?.role === "CLIENT" ? "Cliente" : "Admin";

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-xl mx-auto space-y-6">

      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Mi perfil</h1>
        <p className="text-zinc-500 text-sm mt-1">Gestioná tu información y seguridad de cuenta</p>
      </div>

      {/* ── Card: Foto de perfil ──────────────────────────── */}
      <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl p-6 animate-slide-up">

        {/* User identity */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-white/5">
          <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-orange-500/30 shadow-lg shadow-black/50 shrink-0">
            {uploading ? (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" onError={() => setAvatarUrl("")} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-2xl font-black text-white">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-white">{nameValue || name}</p>
            <p className="text-sm text-zinc-500">{email}</p>
            <span className="mt-1 inline-block text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-full font-bold">
              {roleLabel}
            </span>
          </div>
        </div>

        <form onSubmit={handleAvatarSave} className="space-y-5">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Foto de perfil</p>

          {/* File upload */}
          <label className="cursor-pointer flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-orange-500/30 transition-all group">
            <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-orange-500/10 transition-all">
              <svg className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-all font-medium">
                {uploading ? "Procesando imagen..." : "Elegir imagen"}
              </p>
              <p className="text-xs text-zinc-700">JPG, PNG, WebP · máx 256×256px</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-zinc-700">o usá una URL</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <input
            type="text"
            value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://ejemplo.com/mi-foto.jpg"
            className="input-dark"
          />

          {/* DiceBear quick options */}
          <div>
            <p className="text-xs text-zinc-600 mb-2">Avatares generados:</p>
            <div className="flex gap-2 flex-wrap">
              {["adventurer", "bottts", "pixel-art", "lorelei"].map(style => {
                const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(name)}`;
                return (
                  <button key={style} type="button" onClick={() => setAvatarUrl(url)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      avatarUrl === url
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : "bg-zinc-800 text-zinc-400 hover:text-white border border-white/5"
                    }`}>
                    {style}
                  </button>
                );
              })}
              <button type="button" onClick={() => setAvatarUrl("")}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-500 hover:text-white border border-white/5 transition-all">
                Sin foto
              </button>
            </div>
          </div>

          <button type="submit" disabled={avatarSaving || uploading} className="btn-primary">
            {avatarSaving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : "Guardar foto"
            }
          </button>
        </form>
      </div>

      {/* ── Card: Datos personales ────────────────────────── */}
      <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <form onSubmit={handleNameSave} className="space-y-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Datos personales</p>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Nombre</label>
            <input
              type="text"
              value={nameValue}
              onChange={e => { setNameValue(e.target.value); setNameError(""); }}
              placeholder="Tu nombre"
              maxLength={60}
              className="input-dark"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="input-dark opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-zinc-700 mt-1">El email no se puede modificar.</p>
          </div>

          {nameError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{nameError}</p>
          )}

          <button
            type="submit"
            disabled={nameSaving || !nameValue.trim() || nameValue.trim() === name}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {nameSaving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : "Guardar nombre"
            }
          </button>
        </form>
      </div>

      {/* ── Card: Seguridad ───────────────────────────────── */}
      <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Seguridad</p>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Contraseña actual</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => { setCurrentPwd(e.target.value); setPwdError(""); }}
              placeholder="••••••••"
              autoComplete="current-password"
              className="input-dark"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Nueva contraseña</label>
            <input
              type="password"
              value={newPwd}
              onChange={e => { setNewPwd(e.target.value); setPwdError(""); }}
              placeholder="Mín. 8 caracteres, 1 mayúscula y 1 número"
              autoComplete="new-password"
              className="input-dark"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => { setConfirmPwd(e.target.value); setPwdError(""); }}
              placeholder="Repetí la nueva contraseña"
              autoComplete="new-password"
              className="input-dark"
            />
          </div>

          {pwdError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{pwdError}</p>
          )}
          {pwdSuccess && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
              ✓ Contraseña actualizada correctamente
            </p>
          )}

          <button
            type="submit"
            disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pwdSaving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cambiando...</>
              : "Cambiar contraseña"
            }
          </button>
        </form>
      </div>

    </div>
  );
}
