'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallState {
  /** true si el browser soporta beforeinstallprompt y la app no está instalada */
  canInstall: boolean;
  /** true si la app ya corre en modo standalone */
  isInstalled: boolean;
  /** true si el dispositivo es iOS (iPad/iPhone/iPod) */
  isIOS: boolean;
  /** true si es iOS Safari — no soporta beforeinstallprompt, hay que dar instrucciones manuales */
  isIOSSafari: boolean;
  /** Disparar el prompt nativo del browser */
  install: () => Promise<void>;
  /** El usuario descartó el banner; se guarda en localStorage */
  dismiss: () => void;
  /** true si el usuario ya descartó el banner */
  isDismissed: boolean;
}

const DISMISSED_KEY = 'hyenahub-pwa-install-dismissed';

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    // Leer estado de localStorage
    setIsDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');

    // Detectar iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
    // Safari en iOS: no tiene "Chrome" ni "CriOS" ni "FxiOS" en el UA
    const iosSafari = ios && /^((?!chrome|crios|fxios|android).)*safari/i.test(ua);
    setIsIOS(ios);
    setIsIOSSafari(iosSafari);

    // Detectar si ya está instalada (standalone o navigator.standalone en iOS)
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const alreadyInstalled =
      standaloneMedia.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(alreadyInstalled);

    // Capturar el evento beforeinstallprompt (Chrome/Edge/Android)
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
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
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
