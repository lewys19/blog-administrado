// Botones de formato del editor de Markdown: reglas puras, sin depender de la pantalla.

export type Formato = {
  titulo: string;
  icono: string;
  antes: string;
  despues?: string;
  linea?: boolean;
};

export const FORMATOS: Formato[] = [
  { titulo: "Título 1", icono: "H1", antes: "# ", linea: true },
  { titulo: "Título 2", icono: "H2", antes: "## ", linea: true },
  { titulo: "Título 3", icono: "H3", antes: "### ", linea: true },
  { titulo: "Negrita", icono: "B", antes: "**", despues: "**" },
  { titulo: "Cursiva", icono: "I", antes: "_", despues: "_" },
  { titulo: "Código en línea", icono: "`", antes: "`", despues: "`" },
  { titulo: "Bloque de código", icono: "{ }", antes: "\n```python\n", despues: "\n```\n" },
  { titulo: "Enlace", icono: "🔗", antes: "[", despues: "](https://)" },
  { titulo: "Lista", icono: "•", antes: "- ", linea: true },
  { titulo: "Cita", icono: "❝", antes: "> ", linea: true },
];

export type Edicion = { texto: string; inicio: number; fin: number };

/** Aplica un formato a la selección [i, j) y dice dónde debe quedar el cursor. */
export function aplicarFormato(texto: string, i: number, j: number, f: Formato): Edicion {
  if (f.linea) {
    const inicioLinea = texto.lastIndexOf("\n", i - 1) + 1;
    // Un título reemplaza al anterior: H2 sobre «# Hola» deja «## Hola», no «## # Hola».
    const previo = f.antes.startsWith("#") ? (/^#{1,6} /.exec(texto.slice(inicioLinea))?.[0].length ?? 0) : 0;
    const resto = texto.slice(inicioLinea + previo);
    const delta = f.antes.length - previo;
    return {
      texto: texto.slice(0, inicioLinea) + f.antes + resto,
      inicio: Math.max(inicioLinea + f.antes.length, i + delta),
      fin: Math.max(inicioLinea + f.antes.length, j + delta),
    };
  }
  // Los espacios y saltos de línea de los bordes quedan fuera: «**hola\n**» no es negrita.
  const elegido = texto.slice(i, j);
  const a = i + (elegido.length - elegido.trimStart().length);
  const b = Math.max(a, j - (elegido.length - elegido.trimEnd().length));
  const cierre = f.despues ?? "";
  return {
    texto: texto.slice(0, a) + f.antes + texto.slice(a, b) + cierre + texto.slice(b),
    inicio: a + f.antes.length,
    fin: b + f.antes.length,
  };
}

/** Pone un bloque (por ejemplo una imagen) en líneas propias, en lugar de la selección. */
export function insertarBloque(texto: string, i: number, j: number, bloque: string): Edicion {
  const nuevo = `\n\n${bloque}\n\n`;
  const fin = i + nuevo.length;
  return { texto: texto.slice(0, i) + nuevo + texto.slice(j), inicio: fin, fin };
}
