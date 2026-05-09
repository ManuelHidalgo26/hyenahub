"use client";

import { useEffect, useRef } from "react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "Eliminar", onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="w-full max-w-sm bg-zinc-900 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-red-500 to-orange-500" />

        <div className="p-6">
          <h2 id="confirm-title" className="text-white font-bold text-base">{title}</h2>
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all border border-white/[0.06]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 transition-all shadow-lg shadow-red-500/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
