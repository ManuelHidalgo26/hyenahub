"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getYouTubeId } from "@/lib/video-utils";

interface TrainerVideo {
  id: string; title: string; description: string | null;
  videoUrl: string; exercise: string | null; createdAt: string;
}
interface TrainerInfo {
  id: string; bio: string | null; specialty: string | null;
  user: { name: string; email: string; avatar: string | null };
  videos: TrainerVideo[];
}

export default function MyTrainerPage() {
  const [trainer, setTrainer]  = useState<TrainerInfo | null>(null);
  const [loading, setLoading]  = useState(true);
  const [preview, setPreview]  = useState<TrainerVideo | null>(null);
  const [filter,  setFilter]   = useState("");

  useEffect(() => {
    api.get("/profile/my-trainer").then(r => setTrainer(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  if (!trainer) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 text-sm">No tenés un entrenador asignado todavía.</p>
        </div>
      </div>
    );
  }

  const filtered = trainer.videos.filter(v =>
    !filter ||
    v.title.toLowerCase().includes(filter.toLowerCase()) ||
    (v.exercise ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  const { user } = trainer;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">

      {/* Trainer profile card */}
      <div className="bg-zinc-900 border border-white/[0.06] rounded-3xl overflow-hidden mb-8 animate-slide-up">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
          <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
          {/* Avatar anclado al borde inferior del banner */}
          <div className="absolute bottom-0 left-6 translate-y-1/2 z-20 w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-zinc-900 shadow-xl shadow-black/50">
            {user.avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-3xl font-black text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="relative px-6 pb-6 pt-12">
          {/* Badge alineado a la derecha */}
          <div className="flex justify-end mb-3">
            <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full font-bold">
              Tu entrenador
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white">{user.name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{user.email}</p>

          {trainer.specialty && (
            <div className="mt-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-sm text-zinc-300 font-medium">{trainer.specialty}</span>
            </div>
          )}

          {trainer.bio && (
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed bg-zinc-800/40 border border-white/5 rounded-xl px-4 py-3">
              {trainer.bio}
            </p>
          )}
        </div>
      </div>

      {/* Videos section */}
      <div className="animate-fade-in" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-lg sm:text-xl font-black text-white">
            Videos explicativos
            <span className="ml-2 text-sm font-normal text-zinc-600">({trainer.videos.length})</span>
          </h2>
          {trainer.videos.length > 3 && (
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Buscar por ejercicio..."
              className="input-dark !w-auto !py-2 text-xs"
            />
          )}
        </div>

        {trainer.videos.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <p className="text-zinc-600 text-sm">Tu entrenador todavía no subió videos explicativos.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-8">Sin resultados para "{filter}"</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((v, i) => {
              const ytId = getYouTubeId(v.videoUrl);
              return (
                <div key={v.id}
                  className="group bg-zinc-900 border border-white/[0.06] hover:border-orange-500/25 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_8px_32px_rgba(249,115,22,0.1)] animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
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
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg shadow-orange-500/40">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-white text-sm">{v.title}</h3>
                    {v.exercise && (
                      <span className="inline-block mt-1.5 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">
                        {v.exercise}
                      </span>
                    )}
                    {v.description && (
                      <p className="mt-2 text-xs text-zinc-500 line-clamp-2 leading-relaxed">{v.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video player modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}>
          <div className="w-full max-w-3xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
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
                {getYouTubeId(preview.videoUrl) ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(preview.videoUrl)}`}
                    className="w-full aspect-video rounded-xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    allowFullScreen
                  />
                ) : (
                  <video src={preview.videoUrl} controls className="w-full aspect-video rounded-xl bg-zinc-950" />
                )}
                {preview.description && (
                  <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{preview.description}</p>
                )}
              </div>
            </div>
          </div>
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
        <p className="text-zinc-600 text-sm">Cargando perfil del entrenador...</p>
      </div>
    </div>
  );
}
