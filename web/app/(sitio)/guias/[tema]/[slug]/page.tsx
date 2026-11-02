import type { Metadata } from "next";

import { VistaArticulo, metadatosArticulo } from "@/components/blog/VistaArticulo";

type Props = PageProps<"/guias/[tema]/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadatosArticulo((await params).slug);
}

export default async function PaginaGuia({ params }: Props) {
  const { tema, slug } = await params;
  return <VistaArticulo slug={slug} tipo="guia" tema={tema} />;
}
