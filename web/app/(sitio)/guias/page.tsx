import type { Metadata } from "next";

import { ListaGuias, numeroPagina } from "@/components/blog/ListaGuias";

export const metadata: Metadata = {
  title: "Guías",
  description: "Guías y tutoriales paso a paso de Python, Django, backend y más.",
  alternates: { canonical: "/guias" },
};

export default async function Guias({ searchParams }: PageProps<"/guias">) {
  return <ListaGuias pagina={numeroPagina((await searchParams).pagina)} />;
}
