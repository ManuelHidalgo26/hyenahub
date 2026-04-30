'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent;
  }
}

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isIOSSafari: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
  isDismissed: boolean;
}

const DISMISSED_KEY = 'hyenahub-pwa-install-dismissed';

function detectIOS(): { isIOS: boolean; isIOSSafari: boolean } {
  const ua = navigator.userAgent;

  // iOS clásico: iPhone, iPod, iPad (iOS 12 y anteriores)
  const classicIOS = /iPad|iPhone|iPod/.test(ua);

  // iPad iOS 13+ reporta UA de macOS escritorio — detectar por touch points
  const modernIPad =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  const isIOS = (classicIOS || modernIPad) && !(window as unknown as { MSStream?: unknown }).MSStream;

  // Safari en iOS: no tiene CriOS (Chrome), FxiOS (Firefox) ni EdgiOS (Edge)
  const isIOSSafari =
    isIOS && /^((?!chrome|crios|fxios|edgios|android).)*safari/i.test(ua);

  return { isIOS, isIOSSafari };
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    // Estado persistido
    setIsDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');

    // Detección de plataforma
    const { isIOS: ios, isIOSSafari: iosSafari } = detectIOS();
    setIsIOS(ios);
    setIsIOSSafari(iosSafari);

    // ¿Ya está instalada?
    const alreadyInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(alreadyInstalled);

    // Leer evento pre-capturado por el script en <head>
    // (se dispara antes de que React monte, lo guardamos en window.__pwaPrompt)
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
      delete window.__pwaPrompt;
    }

    // Seguir escuchando por si llega después del montaje
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<void> => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const dismiss = (): void => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    isIOS,
    isIOSSafari,
    install,
    dismiss,
    isDismissed,
  };
}
