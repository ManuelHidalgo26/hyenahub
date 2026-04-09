"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationProvider, useNotifications } from "@/components/NotificationProvider";

function DumbbellIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M4 9h4v6H4V9M16 9h4v6h-4V9" /></svg>;
}

const NAV = {
  TRAINER: [
    { href: "/trainer",        label: "Dashboard",  icon: GridIcon    },
    { href: "/trainer/chat",   label: "Chat",       icon: ChatIcon    },
    { href: "/trainer/videos", label: "Videos",     icon: VideoIcon   },
    { href: "/settings",       label: "Perfil",     icon: SettingsIcon },
  ],
  CLIENT: [
    { href: "/client",           label: "Rutina",   icon: DumbbellIcon },
    { href: "/client/diet",      label: "Dieta",    icon: FoodIcon     },
    { href: "/client/progress",  label: "Progreso", icon: ChartIcon    },
    { href: "/client/chat",      label: "Chat",     icon: ChatIcon     },
    { href: "/client/videos",    label: "Videos",   icon: VideoIcon    },
    { href: "/settings",         label: "Perfil",   icon: SettingsIcon },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: ChartIcon },
  ],
};

const ROLE_META: Record<string, { label: string; color: string }> = {
  TRAINER: { label: "Entrenador", color: "bg-orange-500/15 text-orange-400" },
  CLIENT:  { label: "Cliente",    color: "bg-amber-500/15  text-amber-400"  },
  ADMIN:   { label: "Admin",      color: "bg-red-500/15    text-red-400"    },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <DashboardShell>{children}</DashboardShell>
    </NotificationProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { unreadMessages, clearUnreadMessages } = useNotifications();

  const role   = session?.user?.role as keyof typeof NAV | undefined;
  const links  = role ? NAV[role] ?? [] : [];
  const meta   = role ? ROLE_META[role] : null;
  const name    = session?.user?.name ?? "";
  const initial = name.charAt(0).toUpperCase();

  // Clear unread badge when visiting chat
  useEffect(() => {
    if (pathname?.includes("/chat")) clearUnreadMessages();
  }, [pathname, clearUnreadMessages]);

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const AvatarDisplay = ({ size = 8 }: { size?: number }) => (
    <div className={`w-${size} h-${size} rounded-full overflow-hidden ring-1 ring-orange-500/30 shrink-0`}>
      <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black" style={{ fontSize: size < 9 ? "0.65rem" : "0.75rem" }}>
        {initial}
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] bg-zinc-950 overflow-hidden">

        {/* ════════════════════════════════════════════════
            DESKTOP SIDEBAR (hidden on mobile)
        ════════════════════════════════════════════════ */}
        <aside className="hidden lg:flex w-60 flex-col shrink-0 border-r border-white/[0.05] bg-[#0d0d0f]">

          {/* Logo */}
          <div className="px-5 pt-6 pb-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                <BoltIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-white tracking-tight">TrainerHub</span>
            </div>
            {meta && (
              <span className={`mt-2.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${meta.color}`}>
                {meta.label}
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href.split("/").length > 2 && pathname.startsWith(href));
              const isChat = href.includes("/chat");
              const showBadge = isChat && unreadMessages > 0 && !isActive;
              return (
                <Link key={href} href={href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
                  }`}>
                  <div className="relative shrink-0">
                    <Icon className={`w-4 h-4 ${isActive ? "text-orange-400" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </div>
                  {label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-white/[0.05]">
            <div className="flex items-center gap-3 mb-3">
              <AvatarDisplay size={8} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{name}</p>
                <p className="text-xs text-zinc-600 truncate">{session?.user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200">
              <LogoutIcon className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ════════════════════════════════════════════════
            MAIN AREA (mobile: stacked, desktop: flex)
        ════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* ── MOBILE TOP HEADER ──────────────────────────────── */}
          <header className="lg:hidden flex items-center justify-between px-4 h-14 shrink-0 bg-[#0d0d0f] border-b border-white/[0.05] z-40">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/30">
                <BoltIcon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-black text-white text-sm tracking-tight">TrainerHub</span>
              {meta && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                  {meta.label}
                </span>
              )}
            </div>

            {/* User avatar + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 transition-colors">
                <AvatarDisplay size={8} />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50 animate-slide-up">
                  <div className="px-4 py-3 border-b border-white/[0.05]">
                    <p className="text-sm font-bold text-white truncate">{name}</p>
                    <p className="text-xs text-zinc-500 truncate">{session?.user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-colors">
                    <LogoutIcon className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* ── MAIN CONTENT ───────────────────────────────────── */}
          <main className="flex-1 overflow-auto pb-16 lg:pb-0">
            {children}
          </main>

          {/* ── MOBILE BOTTOM NAV ──────────────────────────────── */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0f]/95 backdrop-blur-xl border-t border-white/[0.05]">
            <div className="flex items-stretch h-16">
              {links.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href.split("/").length > 2 && pathname.startsWith(href));
                const isChat = href.includes("/chat");
                const showBadge = isChat && unreadMessages > 0 && !isActive;
                return (
                  <Link key={href} href={href}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200 relative ${
                      isActive ? "text-orange-400" : "text-zinc-600 hover:text-zinc-400 active:scale-95"
                    }`}>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
                    )}
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-2 min-w-[15px] h-3.5 px-0.5 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide ${isActive ? "text-orange-400" : "text-zinc-600"}`}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
            {/* Safe area for phones with home indicator */}
            <div className="h-safe-bottom" style={{ height: "env(safe-area-inset-bottom)" }} />
          </nav>
        </div>
      </div>
  );
}

/* ─── Icons ──────────────────────────────────────────── */
function BoltIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
}
function GridIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function VideoIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>;
}
function PersonIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function FoodIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 3v5M6 3v5M5 8v13M19 3v18M19 3c-1.5 0-2.5 2-2.5 4s1 2.5 2.5 2.5M16 12a4 4 0 11-8 0 4 4 0 018 0" /></svg>;
}
function ChartIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function ChatIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
}
function LogoutIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
}
function SettingsIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
