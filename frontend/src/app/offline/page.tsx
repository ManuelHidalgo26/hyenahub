export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      {/* Ícono animado */}
      <div className="mb-8 relative">
        <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <svg
            className="w-12 h-12"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* H mark */}
            <rect x="8" y="8" width="8" height="32" rx="3" fill="#f97316" />
            <rect x="32" y="8" width="8" height="32" rx="3" fill="#f97316" />
            <rect x="8" y="20" width="32" height="8" rx="3" fill="#f97316" />
          </svg>
        </div>
        {/* Indicador de sin conexión */}
        <span className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 border-2 border-zinc-800">
          <svg
            className="w-3.5 h-3.5 text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
          </svg>
        </span>
      </div>

      {/* Título */}
      <h1 className="text-2xl font-bold text-white mb-2">Sin conexión</h1>
      <p className="text-zinc-400 text-sm mb-8 max-w-xs leading-relaxed">
        Parece que no tenés conexión a internet. Revisá tu red y volvé a intentarlo.
      </p>

      {/* Acciones */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-6 transition-colors duration-150 active:scale-95"
        >
          Reintentar
        </button>
        <button
          onClick={() => window.history.back()}
          className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-3 px-6 transition-colors duration-150 active:scale-95"
        >
          Volver atrás
        </button>
      </div>

      {/* Info adicional */}
      <div className="mt-12 flex flex-col gap-2 text-xs text-zinc-600 max-w-xs">
        <p>Algunas páginas visitadas recientemente pueden estar disponibles offline.</p>
        <p>
          <span className="text-brand-500 font-medium">HyenaHub</span>
          {" "}guarda contenido en caché automáticamente.
        </p>
      </div>
    </main>
  );
}
