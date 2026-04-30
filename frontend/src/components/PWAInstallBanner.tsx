'use client';

import { useEffect, useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallBanner() {
  const { canInstall, isInstalled, isIOSSafari, install, dismiss, isDismissed } = usePWAInstall();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch — solo renderizar en cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (isInstalled) return null;
  if (isDismissed) return null;
  if (!canInstall && !isIOSSafari) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar HyenaHub"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-up"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-sm shadow-2xl shadow-black/50 overflow-hidden">
        {/* Acento superior naranja */}
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Logo */}
            <div className="shrink-0 w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <svg viewBox="0 0 36 36" fill="none" className="w-6 h-6" aria-hidden="true">
                <rect x="5" y="4" width="7" height="28" rx="2.5" fill="#f97316" />
                <rect x="24" y="4" width="7" height="28" rx="2.5" fill="#f97316" />
                <rect x="5" y="14.5" width="26" height="7" rx="2.5" fill="#f97316" />
              </svg>
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">
                Instalá HyenaHub
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                {isIOSSafari
                  ? 'Agregala a tu pantalla de inicio para acceso rápido'
                  : 'Accedé más rápido desde tu pantalla de inicio'}
              </p>
            </div>

            {/* Cerrar */}
            <button
              onClick={dismiss}
              aria-label="Cerrar banner de instalación"
              className="shrink-0 -mt-0.5 -mr-0.5 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Instrucciones iOS Safari */}
          {isIOSSafari ? (
            <div className="mt-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-3">
              <p className="text-xs text-zinc-400 font-medium mb-2">
                Para instalar en iPhone/iPad:
              </p>
              <ol className="space-y-1.5">
                {[
                  { icon: '⬆️', text: 'Tocá el botón Compartir en Safari' },
                  { icon: '➕', text: 'Seleccioná "Agregar a pantalla de inicio"' },
                  { icon: '✅', text: 'Confirmá tocando "Agregar"' },
                ].map((step, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                    <span className="text-sm leading-none">{step.icon}</span>
                    <span>{step.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            /* Botón de instalación para Chrome/Edge/Android */
            <button
              onClick={install}
              className="mt-3 w-full rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-600 active:scale-[0.98] text-white text-sm font-semibold py-2.5 px-4 transition-all duration-150"
            >
              Instalar app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
