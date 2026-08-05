// Paleta de referencia del skill de dataviz: 8 tonos categoricos validados
// (orden fijo, CVD-safe), mas la pareja divergente y los tokens de texto.
// No generar tonos nuevos: a partir del slot 8, todo cae en "Other" (gris).

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

export const OTHER_COLOR = { light: "#898781", dark: "#898781" }; // muted ink, "Other" bucket

export const DIVERGING = {
  cool: { light: "#2a78d6", dark: "#3987e5" }, // >50% winrate
  warm: { light: "#e34948", dark: "#e66767" }, // <50% winrate
  mid: { light: "#f0efec", dark: "#383835" },
};

export const MAX_CATEGORICAL_SLOTS = CATEGORICAL_HUES.length;

/** Asigna un slot de color fijo a cada arquetipo segun su volumen GLOBAL
 * (sin filtros), para que un filtro que cambie el ranking no repinte a los
 * supervivientes. Los arquetipos fuera del top 8 comparten "Other" (gris). */
export function buildArchetypeColorScale(
  archetypeCountsDesc: string[]
): Map<string, number | null> {
  const scale = new Map<string, number | null>();
  archetypeCountsDesc.forEach((archetype, i) => {
    scale.set(archetype, i < MAX_CATEGORICAL_SLOTS ? i : null);
  });
  return scale;
}

export function colorForSlot(slot: number | null, mode: "light" | "dark" = "light"): string {
  if (slot === null || slot === undefined) return OTHER_COLOR[mode];
  return CATEGORICAL_HUES[slot % MAX_CATEGORICAL_SLOTS][mode];
}
