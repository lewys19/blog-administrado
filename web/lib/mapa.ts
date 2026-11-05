// Intensidad del color de cada país en el mapa de visitas.

/** Entre 0.25 y 1. Con raíz cuadrada, un país con pocas visitas se sigue viendo junto a uno con muchas. */
export function intensidad(visitas: number, maximo: number): number {
  return 0.25 + 0.75 * Math.sqrt(visitas / maximo);
}
