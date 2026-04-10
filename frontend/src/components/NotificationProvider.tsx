"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";
import api from "@/lib/api";

/* ─── Types ───────────────────────────────────────────────────────────────── */
export type ToastType = "success" | "info" | "warning" | "fire";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface NotifCtx {
  toasts: Toast[];
  addToast: (t: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  unreadMessages: number;
  clearUnreadMessages: () => void;
}

/* ─── Context ─────────────────────────────────────────────────────────────── */
const NotifContext = createContext<NotifCtx>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  unreadMessages: 0,
  clearUnreadMessages: () => {},
});

export function useNotifications() {
  return useContext(NotifContext);
}

/* ─── Provider ────────────────────────────────────────────────────────────── */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const clearUnreadMessages = useCallback(() => setUnreadMessages(0), []);

  // Load initial unread count on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    api.get("/messages").then(r => {
      setUnreadMessages(r.data?.data?.count ?? 0);
    }).catch(() => {});
  }, [session?.user?.id]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [{ ...toast, id }, ...prev].slice(0, 5)); // max 5
    const timer = setTimeout(() => removeToast(id), 5000);
    timers.current.set(id, timer);
  }, [removeToast]);

  /* ── Pusher connection ──────────────────────────────────────────────────── */
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-user-${userId}`);

    // New message from another user
    channel.bind("message.new", (data: { senderId: string; senderName?: string; body: string }) => {
      if (data.senderId === userId) return; // ignore own messages
      const onChatPage = pathnameRef.current?.includes("/chat");
      // Only increment badge when not already reading the chat
      if (!onChatPage) setUnreadMessages(prev => prev + 1);
      // Show toast only when not on the chat page
      if (!onChatPage) {
        addToast({
          type: "info",
          title: `Nuevo mensaje de ${data.senderName ?? "tu entrenador"}`,
          message: data.body.length > 60 ? data.body.slice(0, 60) + "…" : data.body,
        });
        // Browser notification if permitted
        if (typeof window !== "undefined" && Notification?.permission === "granted") {
          new Notification(`Mensaje de ${data.senderName ?? "HyenaHub"}`, {
            body: data.body.length > 80 ? data.body.slice(0, 80) + "…" : data.body,
            icon: "/icon.png",
          });
        }
      }
    });

    // Trainer receives this when a client completes their full session
    channel.bind("session.completed", (data: { clientName: string; message: string }) => {
      addToast({
        type: "fire",
        title: "¡Sesión completada! 🔥",
        message: data.message ?? `${data.clientName} completó su sesión de hoy`,
      });
    });

    // Trainer receives individual exercise completions
    channel.bind("exercise.completed", (_data: { exerciseId: string }) => {
      // we don't show toasts per exercise — only per session
    });

    return () => {
      pusher.unsubscribe(`private-user-${userId}`);
    };
  }, [session?.user?.id, addToast]);

  return (
    <NotifContext.Provider value={{ toasts, addToast, removeToast, unreadMessages, clearUnreadMessages }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </NotifContext.Provider>
  );
}

/* ─── Toast UI ────────────────────────────────────────────────────────────── */
const TYPE_STYLES: Record<ToastType, { bar: string; icon: React.ReactNode; ring: string }> = {
  fire: {
    bar: "bg-gradient-to-r from-orange-500 to-amber-500",
    ring: "ring-orange-500/20",
    icon: <span className="text-xl">🔥</span>,
  },
  success: {
    bar: "bg-gradient-to-r from-emerald-500 to-green-500",
    ring: "ring-emerald-500/20",
    icon: <span className="text-xl">✅</span>,
  },
  info: {
    bar: "bg-gradient-to-r from-blue-500 to-cyan-500",
    ring: "ring-blue-500/20",
    icon: <span className="text-xl">💬</span>,
  },
  warning: {
    bar: "bg-gradient-to-r from-yellow-500 to-amber-400",
    ring: "ring-yellow-500/20",
    icon: <span className="text-xl">⚠️</span>,
  },
};

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const s = TYPE_STYLES[toast.type];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  }

  return (
    <div
      className={`pointer-events-auto w-80 rounded-2xl overflow-hidden bg-zinc-900 ring-1 ${s.ring} shadow-2xl shadow-black/60
        transition-all duration-300 ease-out
        ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"}`}
    >
      {/* Top bar */}
      <div className={`h-1 w-full ${s.bar}`} />

      <div className="p-4 flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{s.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm">{toast.title}</p>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors ml-1 mt-0.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
