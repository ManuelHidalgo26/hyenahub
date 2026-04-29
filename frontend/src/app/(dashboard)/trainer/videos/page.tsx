"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useNotifications } from "@/components/NotificationProvider";

interface TrainerVideo {
  id: string; title: string; description: string | null;
  videoUrl: string; exercise: string | null; createdAt: string;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function getGoogleDriveId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function isValidVideoUrl(url: string): boolean {
  try { new URL(url); } catch { return false; }
  return !!(getYouTubeId(url) || getVimeoId(url) || getGoogleDriveId(url) || isDirectVideo(url));
}

function VideoEmbed({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}`}
        className="w-full aspect-video rounded-xl"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        allowFullScreen
      />
    );
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}`}
        className="w-full aspect-video rounded-xl"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  const driveId = getGoogleDriveId(url);
  if (driveId) {
    return (
      <iframe
        src={`https://drive.google.com/file/d/${driveId}/preview`}
        className="w-full aspect-video rounded-xl"
        allow="autoplay"
        allowFullScreen
      />
    );
  }

  if (isDirectVideo(url)) {
    return (
      <video src={url} controls className="w-full aspect-video rounded-xl bg-zinc-950" />
    );
  }

  // Unknown URL — open externally
  return (
    <div className="w-full aspect-video rounded-xl bg-zinc-900 border border-white/[0.06] flex flex-col items-center justify-center gap-4">
      <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Abrir video
      </a>
      <p className="text-xs text-zinc-600 px-6 text-center">Este formato no se puede reproducir en el navegador. Usá YouTube, Vimeo o un link .mp4 directo.</p>
    </div>
  );
}

export default function TrainerVideosPage() {
  const { addToast } = useNotifications();
  const [videos,    setVideos]    = useState<TrainerVideo[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [title,     setTitle]     = useState("");
  const [desc,      setDesc]      = useState("");
  const [url,       setUrl]       = useState("");
  const [exercise,  setExercise]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [preview,   setPreview]   = useState<TrainerVideo | null>(null);

  useEffect(() => {
    api.get("/videos")
      .then(r => setVideos(r.data.data))
      .catch(() => addToast({ type: "warning", title: "Error", message: "No se pudieron cargar los videos." }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidVideoUrl(url)) {
      setError("URL no reconocida. Usá un enlace de YouTube, Vimeo, Google Drive o un archivo .mp4 directo.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/videos", {
        title, description: desc || undefined, videoUrl: url, exercise: exercise || undefined,
      });
      setVideos(prev => [res.data.data, ...prev]);
      setShowForm(false); setTitle(""); setDesc(""); setUrl(""); setExercise("");
    } catch {
      setError("Error al guardar el video. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este video?")) return;
    try {
      await api.delete(`/videos/${id}`);
      setVideos(prev => prev.filter(v => v.id !== id));
      if (preview?.id === id) setPreview(null);
    } catch {
      addToast({ type: "warning", title: "Error", message: "No se pudo eliminar el video." });
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 sm:mb-8 animate-fade-in gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Mis videos</h1>
          <p className="text-zinc-500 text-sm mt-1">Tutoriales y explicaciones para tus clientes</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className={`shrink-0 ${showForm ? "btn-ghost" : "btn-primary"}`}>
          {showForm ? "Cancelar" : (
            <><span className="text-lg leading-none">+</span> <span className="hidden sm:inline">Agregar </span>video</>
          )}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit}
          className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-6 mb-8 space-y-4 animate-slide-up-sm">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            Nuevo video explicativo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Título *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Sentadilla correcta" className="input-dark" required />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Ejercicio relacionado</label>
              <input value={exercise} onChange={e => setExercise(e.target.value)}
                placeholder="Ej: Sentadilla con barra" className="input-dark" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">URL del video *</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... o enlace directo a MP4" className="input-dark" required />
            <p className="text-xs text-zinc-600 mt-1.5">Compatible con YouTube, Vimeo y videos directos (.mp4)</p>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Descripción</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Puntos clave, errores comunes, consejos..." className="input-dark resize-none" />
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</> : "Guardar video"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
          </div>
        </form>
      )}

      {/* Video preview modal overlay */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}>
          <div className="w-full max-w-3xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <h3 className="font-bold text-white">{preview.title}</h3>
                  {preview.exercise && (
                    <span className="text-xs text-orange-400 font-medium">Ejercicio: {preview.exercise}</span>
                  )}
                </div>
                <button onClick={() => setPreview(null)} className="text-zinc-500 hover:text-white text-2xl leading-none transition-colors">×</button>
              </div>
              <div className="p-4">
                <VideoEmbed url={preview.videoUrl} />
                {preview.description && (
                  <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{preview.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Videos grid */}
      {videos.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <p className="text-zinc-600 text-sm">Todavía no subiste ningún video.</p>
          <p className="text-zinc-700 text-xs mt-1">Agregá tutoriales para que tus clientes puedan verlos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v, i) => {
            const ytId = getYouTubeId(v.videoUrl);
            const vimeoId = getVimeoId(v.videoUrl);
            return (
              <div key={v.id}
                className="group bg-zinc-900 border border-white/[0.06] hover:border-orange-500/25 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_rgba(249,115,22,0.1)] animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}>
                {/* Thumbnail / preview area */}
                <div
                  className="relative aspect-video bg-zinc-800 cursor-pointer overflow-hidden"
                  onClick={() => setPreview(v)}
                >
                  {ytId ? (
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : vimeoId ? (
                    <img
                      src={`https://vumbnail.com/${vimeoId}.jpg`}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg shadow-orange-500/40">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-white text-sm line-clamp-1">{v.title}</h3>
                  {v.exercise && (
                    <span className="inline-block mt-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">
                      {v.exercise}
                    </span>
                  )}
                  {v.description && (
                    <p className="mt-2 text-xs text-zinc-500 line-clamp-2 leading-relaxed">{v.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-zinc-700">
                      {new Date(v.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </span>
                    <button onClick={() => handleDelete(v.id)}
                      className="text-xs text-zinc-700 hover:text-red-400 transition-colors">Eliminar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-zinc-600 text-sm">Cargando videos...</p>
      </div>
    </div>
  );
}
