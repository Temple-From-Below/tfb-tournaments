// Paleta de referencia del skill de dataviz: 8 tonos categoricos validados
// (orden fijo, CVD-safe) para los arquetipos mas comunes. A partir de ahi
// hay demasiadas categorias para que un unico set de tonos siga siendo
// distinguible con garantias (con 8+ categorias en pantalla a la vez ya no
// hay orden que pase todos los pares) — pero el proyecto pide que CADA
// arquetipo tenga su propio color, asi que generamos tonos adicionales
// espaciados por el angulo dorado (maxima separacion de tono posible entre
// vecinos) para los que quedan fuera del top 8.

export const CATEGORICAL_HUES = [
  { light: "#2a78d6", dark: "#3987e5" }, // 1 blue
  { light: "#eb6834", dark: "#d95926" }, // 2 orange
  { light: "#1baf7a", dark: "#199e70" }, // 3 aqua
  { light: "#eda100", dark: "#c98500" }, // 4 yellow
  { light: "#e87ba4", dark: "#d55181" }, // 5 magenta
  { light: "#008300", dark: "#008300" }, // 6 green
  { light: "#4a3aa7", dark: "#9085e9" }, // 7 violet
  { light: "#e34948", dark: "#e66767" }, // 8 red
] as const;

export const DIVERGING = {
  cool: { light: "#2a78d6", dark: "#3987e5" }, // >50% winrate
  warm: { light: "#e34948", dark: "#e66767" }, // <50% winrate
  mid: { light: "#f0efec", dark: "#383835" },
};

export const MAX_CATEGORICAL_SLOTS = CATEGORICAL_HUES.length;

const GOLDEN_ANGLE = 137.508;

/** Asigna un slot de color a cada arquetipo segun su volumen GLOBAL (sin
 * filtros), para que un filtro que cambie el ranking no repinte a los
 * supervivientes. Todos los arquetipos reciben un slot (ninguno cae en un
 * "Other" gris) — ver nota arriba sobre los limites de esto pasado el 8. */
export function buildArchetypeColorScale(archetypeCountsDesc: string[]): Map<string, number> {
  const scale = new Map<string, number>();
  archetypeCountsDesc.forEach((archetype, i) => scale.set(archetype, i));
  return scale;
}

export function colorForSlot(slot: number | null, mode: "light" | "dark" = "light"): string {
  if (slot === null || slot === undefined) return mode === "dark" ? "#c3c2b7" : "#898781";
  if (slot < MAX_CATEGORICAL_SLOTS) return CATEGORICAL_HUES[slot][mode];
  const hue = Math.round((slot * GOLDEN_ANGLE) % 360);
  const light = mode === "dark" ? "62%" : "42%";
  return `hsl(${hue} 60% ${light})`;
}
