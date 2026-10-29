import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "zcorp-stack · Tecnología, IA y programación", template: "%s · zcorp-stack" },
  description: "Artículos de tecnología, inteligencia artificial y programación: Python, FastAPI, SQL, QA e IA.",
};

export const viewport: Viewport = {
  themeColor: "#0f2a1d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
