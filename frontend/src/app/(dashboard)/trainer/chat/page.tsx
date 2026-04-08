"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import { getPusherClient } from "@/lib/pusher-client";

interface ClientEntry { id: string; user: { id: string; name: string; email: string; } }
interface Message { id: string; senderId: string; body: string; createdAt: string; }

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-xs shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function TrainerChatPage() {
  const { data: session } = useSession();
  const [clients,  setClients]  = useState<ClientEntry[]>([]);
  const [selected, setSelected] = useState<ClientEntry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [loadMsgs, setLoadMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const myId = session?.user?.id;
  const selectedRef = useRef<ClientEntry | null>(null);

  useEffect(() => {
    api.get("/trainer/clients")
      .then(r => setClients(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  // Keep selectedRef in sync so Pusher callback always reads the latest selected client
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Pusher: subscribe to trainer's private channel for incoming messages
  useEffect(() => {
    if (!myId) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-user-${myId}`);
    channel.bind("message.new", (msg: Message) => {
      const currentSelected = selectedRef.current;
      if (currentSelected && (msg.senderId === currentSelected.user.id || msg.senderId === myId)) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
    });
    return () => {
      pusher.unsubscribe(`private-user-${myId}`);
    };
  }, [myId]);

  // Load conversation when a client is selected
  useEffect(() => {
    if (!selected) return;
    setLoadMsgs(true);
    api.get(`/messages/${selected.user.id}`)
      .then(r => setMessages(r.data.data))
      .finally(() => setLoadMsgs(false));
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selected || !myId) return;
    const body = input.trim();
    setInput("");
    await api.post(`/messages/${selected.user.id}`, { body });
  }

  return (
    <div className="flex h-full">

      {/* Sidebar: client list */}
      <aside className={`${selected ? "hidden sm:flex" : "flex"} w-full sm:w-64 flex-col shrink-0 border-r border-white/[0.06]`}>
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <h1 className="text-lg font-black text-white">Mensajes</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Conversaciones con clientes</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center mt-6 px-4">No tenés clientes aún.</p>
          ) : (
            clients.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selected?.id === c.id ? "bg-orange-500/10 border-r-2 border-orange-500" : "hover:bg-white/[0.03]"
                }`}>
                <Avatar name={c.user.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-200 truncate">{c.user.name}</p>
                  <p className="text-xs text-zinc-600 truncate">{c.user.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      {!selected ? (
        <div className="hidden sm:flex flex-1 items-center justify-center text-center p-8">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">Seleccioná un cliente para chatear</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chat header */}
          <div className="shrink-0 flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-white/[0.06]">
            <button className="sm:hidden text-zinc-500 hover:text-white mr-1" onClick={() => setSelected(null)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <Avatar name={selected.user.name} />
            <div>
              <p className="text-sm font-bold text-white">{selected.user.name}</p>
              <p className="text-xs text-zinc-500">{selected.user.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-2">
            {loadMsgs ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-zinc-600 text-sm">Ningún mensaje aún.</p>
                <p className="text-zinc-700 text-xs mt-1">Iniciá la conversación con {selected.user.name}.</p>
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
            className="shrink-0 flex items-center gap-2 px-4 sm:px-5 py-4 border-t border-white/[0.06]">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Mensaje para ${selected.user.name}...`}
              className="flex-1 bg-zinc-900 border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 transition-colors"
            />
            <button type="submit" disabled={!input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-30 flex items-center justify-center transition-all">
              <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
