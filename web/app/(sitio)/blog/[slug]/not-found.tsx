import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">No encontramos este artículo</h1>
      <p className="mt-2 text-texto-2">Puede que haya cambiado de dirección o que todavía no esté publicado.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-lateral px-5 py-2 font-semibold text-white">
        Ir a la portada
      </Link>
    </div>
  );
}
