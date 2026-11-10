// Abreviaciones de nombres de torneo, usadas solo en el listado de filtros
// (en el resto de la app se muestra siempre el nombre completo).
const ABBREVIATIONS: [RegExp, string][] = [
  [/Pauper Navideño/g, "Navideño"],
  [/Pauper Tribals/g, "PTribals"],
  [/Jornada /g, "J"],
  [/Liga Pauper/g, "LP"],
  [/Gran Pauper/g, "GP"],
  [/Festes del Crist/g, "FdC"],
  [/Mensual/g, "M."],
];

// Torneos con un formato distinto (p.ej. Tribals) que no se seleccionan al
// cargar la web, para no mezclar su metagame con el resto por defecto.
const EXCLUDED_BY_DEFAULT: RegExp[] = [/^Pauper Tribals/];

export function isSelectedByDefault(name: string): boolean {
  return !EXCLUDED_BY_DEFAULT.some((pattern) => pattern.test(name));
}

export function abbreviateTournamentName(name: string): string {
  return ABBREVIATIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), name);
}
