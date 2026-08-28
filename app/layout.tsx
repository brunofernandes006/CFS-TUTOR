import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "CFS Tutor — Sargento PMESP",
  description: "Sistema estratégico e adaptativo de estudos para o CFS PMESP. Ferramenta independente.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CFS Tutor",
  },
};

export const viewport: Viewport = {
  themeColor: "#071a2b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PWARegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
