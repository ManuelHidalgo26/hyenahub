import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import PWAInstallBanner from "@/components/PWAInstallBanner";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "HyenaHub",
    template: "%s | HyenaHub",
  },
  description: "Plataforma de gestión para entrenadores personales",
  applicationName: "HyenaHub",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HyenaHub",
    startupImage: [
      {
        url: "/icons/apple-touch-icon.svg",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.svg", sizes: "32x32", type: "image/svg+xml" },
      { url: "/hyena-icon.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/hyena-icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    other: [
      { rel: "mask-icon", url: "/icons/maskable-icon.svg", color: "#f97316" },
    ],
  },
  other: {
    // iOS PWA meta tags adicionales
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "HyenaHub",
    // Windows / Edge
    "msapplication-TileColor": "#09090b",
    "msapplication-TileImage": "/hyena-icon.png",
    "msapplication-tap-highlight": "no",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Preload del manifest para iOS */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <PWAInstallBanner />
      </body>
    </html>
  );
}
