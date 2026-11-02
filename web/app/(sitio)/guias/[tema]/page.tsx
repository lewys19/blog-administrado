import type { Metadata } from "next";

import { ListaGuias, numeroPagina, temasGuia } from "@/components/blog/ListaGuias";

type Props = PageProps<"/guias/[tema]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tema } = await params;
  const t = (await temasGuia()).find((x) => x.slug === tema);
  return t
    ? { title: `Guías de ${t.nombre}`, description: `Tutoriales paso a paso de ${t.nombre}.`, alternates: { canonical: `/guias/${t.slug}` } }
    : { title: "Tema no encontrado" };
}

export default async function GuiasDeTema({ params, searchParams }: Props) {
  const [{ tema }, sp] = await Promise.all([params, searchParams]);
  return <ListaGuias tema={tema} pagina={numeroPagina(sp.pagina)} />;
}
