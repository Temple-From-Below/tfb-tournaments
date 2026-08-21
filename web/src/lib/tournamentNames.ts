// Abreviaciones de nombres de torneo, usadas solo en el listado de filtros
// (en el resto de la app se muestra siempre el nombre completo).
const ABBREVIATIONS: [RegExp, string][] = [
  [/Pauper Navideño/g, "Navideño"],
  [/Jornada /g, "J"],
  [/Liga Pauper/g, "LP"],
  [/Gran Pauper/g, "GP"],
  [/Festes del Crist/g, "FdC"],
  [/Mensual/g, "M."],
];

export function abbreviateTournamentName(name: string): string {
  return ABBREVIATIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), name);
}
