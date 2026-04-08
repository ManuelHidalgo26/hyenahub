"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import { useNotifications } from "@/components/NotificationProvider";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { addToast } = useNotifications();
  const name  = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";

  const [avatarUrl,  setAvatarUrl]  = useState("");
  // Load current avatar from API (not from JWT, avatar is too large for cookies)
  useEffect(() => {
    api.get("/profile").then(r => {
      if (r.data?.data?.avatar) setAvatarUrl(r.data.data.avatar);
    }).catch(() => {});
  }, []);

  const [saving,     setSaving]     = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState("");
  const [uploading,  setUploading]  = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSuccess(false); setError("");
    try {
      await api.patch("/profile/avatar", { avatar: avatarUrl });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      addToast({ type: "success", title: "Perfil actualizado", message: "Tu foto de perfil fue guardada correctamente." });
    } catch {
      setError("No se pudo guardar. Verificá que sea una URL o imagen válida.");
      addToast({ type: "warning", title: "Error al guardar", message: "No se pudo actualizar la foto. Verificá el formato." });
    } finally {
      setSaving(false);
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
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-xl mx-auto">
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Mi perfil</h1>
        <p className="text-zinc-500 text-sm mt-1">Personalizá tu información y foto de perfil</p>
      </div>

      {/* Profile card */}
      <div className="mt-8 bg-zinc-900 border border-white/[0.06] rounded-2xl p-6 animate-slide-up">
        {/* Current avatar preview */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-white/5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-orange-500/30 shadow-lg shadow-black/50 shrink-0">
            {uploading ? (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover"
                onError={() => setAvatarUrl("")} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-3xl font-black text-white">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-white text-lg">{name}</p>
            <p className="text-sm text-zinc-500">{email}</p>
            <span className="mt-1 inline-block text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-full font-bold">
              {session?.user?.role === "TRAINER" ? "Entrenador" : session?.user?.role === "CLIENT" ? "Cliente" : "Admin"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">

          {/* File upload */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">
              Subir imagen desde tu dispositivo
            </label>
            <label className="cursor-pointer flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-orange-500/30 transition-all group">
              <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-orange-500/10 transition-all">
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-zinc-700">o usá una URL</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* URL input */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">
              URL de foto de perfil
            </label>
            <input
              type="text"
              value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://ejemplo.com/mi-foto.jpg"
              className="input-dark"
            />
            <p className="text-xs text-zinc-700 mt-1.5">
              Pegá la URL de cualquier imagen pública (JPG, PNG, WebP).
            </p>
          </div>

          {/* Quick suggestions */}
          <div>
            <p className="text-xs text-zinc-600 mb-2">O usá un avatar generado:</p>
            <div className="flex gap-2 flex-wrap">
              {["adventurer", "bottts", "pixel-art", "lorelei"].map(style => {
                const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(name)}`;
                return (
                  <button key={style} type="button"
                    onClick={() => setAvatarUrl(url)}
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

          {error   && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>}
          {success && <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">✓ Foto actualizada correctamente</p>}

          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : "Guardar cambios"
            }
          </button>
        </form>
      </div>
    </div>
  );
}
