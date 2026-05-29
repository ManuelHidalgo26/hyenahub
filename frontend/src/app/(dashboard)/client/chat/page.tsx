"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import { getPusherClient } from "@/lib/pusher-client";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useNotifications } from "@/components/NotificationProvider";

interface Message { id: string; senderId: string; body: string; createdAt: string; read: boolean; }
interface TrainerInfo { user: { id: string; name: string; avatar: string | null } }

function Avatar({ name, avatar, size = 8 }: { name: string; avatar?: string | null; size?: number }) {
  return (
    <div className="rounded-full overflow-hidden shrink-0" style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-xs">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function ClientChatPage() {
  const { data: session } = useSession();
  const [trainer,  setTrainer]  = useState<TrainerInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const myId = session?.user?.id;
  const { clearUnreadMessages } = useNotifications();
  useEffect(() => { clearUnreadMessages(); }, [clearUnreadMessages]);

  function load() {
    setLoading(true); setFetchErr("");
    api.get("/profile/my-trainer")
      .then(async trainerRes => {
        const t: TrainerInfo = trainerRes.data.data;
        setTrainer(t);
        const msgsRes = await api.get(`/messages/${t.user.id}`);
        setMessages(msgsRes.data.data);
      })
      .catch((e: Error) => setFetchErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // Pusher: receive new messages in real-time
  useEffect(() => {
    if (!myId) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-user-${myId}`);
    channel.bind("message:new", (msg: Message) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
    return () => { pusher.unsubscribe(`private-user-${myId}`); };
  }, [myId]);

  // Polling fallback: sync every 3s in case Pusher auth fails
  const trainerRef = useRef<TrainerInfo | null>(null);
  useEffect(() => { trainerRef.current = trainer; }, [trainer]);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = trainerRef.current;
      if (!t) return;
      api.get(`/messages/${t.user.id}`).then(r => {
        const server: Message[] = r.data.data;
        const serverIds = new Set(server.map((m: Message) => m.id));
        setMessages(prev => {
          const pending = prev.filter(m => m.id.startsWith("temp-") && !serverIds.has(m.id));
          return [...server, ...pending].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !trainer || !myId) return;
    const body = input.trim();
    setInput("");

    // Optimistic update — show message immediately
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: myId,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await api.post(`/messages/${trainer.user.id}`, { body });
      const confirmed: Message = res.data.data;
      // Replace optimistic with confirmed message (Pusher echo will dedup)
      setMessages(prev =>
        prev.map(m => m.id === tempId ? confirmed : m)
      );
    } catch {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  if (fetchErr) return <ErrorBanner message={fetchErr} onRetry={load} />;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/[0.06] bg-zinc-950/50 backdrop-blur-sm">
        {trainer && <Avatar name={trainer.user.name} avatar={trainer.user.avatar} size={9} />}
        <div>
          <p className="text-sm font-bold text-white">{trainer?.user.name ?? "..."}</p>
          <p className="text-xs text-zinc-500">Tu entrenador personal</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-orange-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm font-medium">Iniciá la conversación</p>
            <p className="text-zinc-700 text-xs mt-1">Escribile a tu entrenador, te responderá pronto.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.senderId === myId;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "bg-orange-500/20 border border-orange-500/25 text-zinc-100 rounded-br-sm"
                    : "bg-zinc-800 border border-white/[0.06] text-zinc-200 rounded-bl-sm"
                }`}>
                  <p className="text-sm leading-relaxed break-words">{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-orange-400/50 text-right" : "text-zinc-600"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage}
        className="shrink-0 flex items-center gap-2 px-4 sm:px-6 py-4 border-t border-white/[0.06] bg-zinc-950/50">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 bg-zinc-900 border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 transition-colors"
        />
        <button type="submit" disabled={!input.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all">
          <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
