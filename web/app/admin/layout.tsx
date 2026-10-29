import type { Metadata } from "next";

import { Panel } from "@/components/panel/Panel";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

// El panel es otra aplicación dentro del mismo sitio: sin el encabezado público.
export default function LayoutPanel({ children }: LayoutProps<"/admin">) {
  return <Panel>{children}</Panel>;
}
