"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ErrorBanner } from "@/components/ErrorBanner";

interface TrainerVideo {
  id: string; title: string; description: string | null;
  videoUrl: string; exercise: string | null; createdAt: string;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
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
  return <video src={url} controls className="w-full aspect-video rounded-xl bg-zinc-950" />;
}

export default function ClientVideosPage() {
  const [videos,   setVideos]   = useState<TrainerVideo[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState("");
  const [preview,  setPreview]  = useState<TrainerVideo | null>(null);
  const [search,   setSearch]   = useState("");

  function load() {
    setLoading(true); setFetchErr("");
    api.get("/profile/my-trainer")
      .then(r => setVideos(r.data.data?.videos ?? []))
      .catch((e: Error) => setFetchErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (fetchErr) return <ErrorBanner message={fetchErr} onRetry={load} />;

  const filtered = search.trim()
    ? videos.filter(v =>
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        (v.exercise ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (v.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : videos;

  // Group by exercise tag (ungrouped = "General")
  const groups: Record<string, TrainerVideo[]> = {};
  filtered.forEach(v => {
    const key = v.exercise ?? "General";
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="animate-fade-in mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Videos</h1>
        <p className="text-zinc-500 text-sm mt-1">Tutoriales y explicaciones de tu entrenador</p>
      </div>

      {/* Search */}
      {videos.length > 0 && (
        <div className="relative mb-6 animate-fade-in">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ejercicio o título..."
            className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 transition-colors"
          />
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}>
          <div className="w-full max-w-3xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                <div>
                  <h3 className="font-bold text-white">{preview.title}</h3>
                  {preview.exercise && (
                    <span className="text-xs text-orange-400 font-medium">Ejercicio: {preview.exercise}</span>
                  )}
                </div>
                <button onClick={() => setPreview(null)}
                  className="text-zinc-500 hover:text-white text-2xl leading-none transition-colors">×</button>
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

      {/* Loading skeleton */}
      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-zinc-800 rounded-full w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden">
                <div className="aspect-video bg-zinc-800" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-zinc-800 rounded-full w-3/4" />
                  <div className="h-2.5 bg-zinc-800 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : videos.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-14 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/15 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-orange-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <p className="text-white font-semibold text-sm">Todavía no hay videos disponibles</p>
          <p className="text-zinc-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            Tu entrenador todavía no publicó videos. Cuando lo haga, aparecerán aquí.
          </p>
          <div className="mt-6 flex items-center gap-2 justify-center text-xs text-zinc-600">
            <svg className="w-3.5 h-3.5 text-orange-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Te notificaremos cuando tu entrenador suba contenido
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm animate-fade-in">
          No se encontraron videos para &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {Object.entries(groups).map(([group, groupVideos]) => (
            <div key={group}>
              {/* Group header */}
              {Object.keys(groups).length > 1 && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{group}</span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <span className="text-xs text-zinc-700">{groupVideos.length}</span>
                </div>
              )}

              {/* Video grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupVideos.map((v, i) => {
                  const ytId = getYouTubeId(v.videoUrl);
                  return (
                    <div key={v.id}
                      className="group bg-zinc-900 border border-white/[0.06] hover:border-orange-500/25 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_rgba(249,115,22,0.1)] cursor-pointer animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms` }}
                      onClick={() => setPreview(v)}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-zinc-800 overflow-hidden">
                        {ytId ? (
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
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
                        <p className="mt-2 text-xs text-zinc-700">
                          {new Date(v.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
