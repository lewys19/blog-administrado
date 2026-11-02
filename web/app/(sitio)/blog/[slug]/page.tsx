import type { Metadata } from "next";

import { VistaArticulo, metadatosArticulo } from "@/components/blog/VistaArticulo";

type Props = PageProps<"/blog/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadatosArticulo((await params).slug);
}

export default async function PaginaNoticia({ params }: Props) {
  return <VistaArticulo slug={(await params).slug} tipo="noticia" />;
}
