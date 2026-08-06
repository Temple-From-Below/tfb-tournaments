import type { CardRow, MatchRow, StandingRow, Tournament } from "../types";

export type GameMode = "bo1" | "bo3";

/** Winrate = victorias / (victorias + derrotas). Los empates NO puntuan
 * como medio punto: se excluyen tanto del numerador como del denominador
 * (en bo1 no hay empates de todos modos, ya que se cuenta juego a juego). */
function winratePctOf(wins: number, losses: number): number | null {
  const decisive = wins + losses;
  return decisive > 0 ? (wins / decisive) * 100 : null;
}

// ---------------------------------------------------------------------------
// Arquetipos: registro de victorias/derrotas/empates y cuota de metagame
// ---------------------------------------------------------------------------

export interface ArchetypeStat {
  archetype: string;
  deckCount: number;
  metaSharePct: number;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  winratePct: number | null;
}

export function computeArchetypeStats(
  standings: StandingRow[],
  matches: MatchRow[],
  mode: GameMode = "bo3"
): ArchetypeStat[] {
  const known = standings.filter((s) => s.archetype);
  const deckCounts = new Map<string, number>();
  for (const s of known) {
    deckCounts.set(s.archetype!, (deckCounts.get(s.archetype!) ?? 0) + 1);
  }
  const totalKnown = known.length;

  const record = new Map<string, { wins: number; losses: number; draws: number }>();
  function bump(archetype: string, w: number, l: number, d: number) {
    const cur = record.get(archetype) ?? { wins: 0, losses: 0, draws: 0 };
    cur.wins += w;
    cur.losses += l;
    cur.draws += d;
    record.set(archetype, cur);
  }
  for (const m of matches) {
    if (m.is_bye) continue;
    if (mode === "bo1") {
      if (m.archetype_1) bump(m.archetype_1, m.player_1_wins, m.player_2_wins, 0);
      if (m.archetype_2) bump(m.archetype_2, m.player_2_wins, m.player_1_wins, 0);
      continue;
    }
    if (m.archetype_1) {
      if (m.is_draw) bump(m.archetype_1, 0, 0, 1);
      else if (m.player_winner === 1) bump(m.archetype_1, 1, 0, 0);
      else if (m.player_winner === 2) bump(m.archetype_1, 0, 1, 0);
    }
    if (m.archetype_2) {
      if (m.is_draw) bump(m.archetype_2, 0, 0, 1);
      else if (m.player_winner === 2) bump(m.archetype_2, 1, 0, 0);
      else if (m.player_winner === 1) bump(m.archetype_2, 0, 1, 0);
    }
  }

  const archetypes = new Set([...deckCounts.keys(), ...record.keys()]);
  return Array.from(archetypes).map((archetype) => {
    const deckCount = deckCounts.get(archetype) ?? 0;
    const rec = record.get(archetype) ?? { wins: 0, losses: 0, draws: 0 };
    const games = rec.wins + rec.losses + rec.draws;
    return {
      archetype,
      deckCount,
      metaSharePct: totalKnown > 0 ? (deckCount / totalKnown) * 100 : 0,
      wins: rec.wins,
      losses: rec.losses,
      draws: rec.draws,
      games,
      winratePct: winratePctOf(rec.wins, rec.losses),
    };
  });
}

/** Orden por defecto de arquetipos, compartido entre la tabla de Metagame
 * y los ejes de la matriz de enfrentamientos (para que ambos muestren el
 * mismo orden): % de meta descendente, empate por winrate descendente,
 * empate por victorias descendente, empate por derrotas ascendente. */
export function sortArchetypeStatsDefault(stats: ArchetypeStat[]): ArchetypeStat[] {
  return [...stats].sort((a, b) => {
    if (b.metaSharePct !== a.metaSharePct) return b.metaSharePct - a.metaSharePct;
    const aw = a.winratePct ?? -1;
    const bw = b.winratePct ?? -1;
    if (bw !== aw) return bw - aw;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });
}

/** Ranking global de arquetipos (sin filtros) por numero de mazos - se usa
 * para fijar el color de cada arquetipo con independencia de los filtros
 * activos ("el color sigue a la entidad, nunca a su rango"). */
export function globalArchetypeRankingDesc(standings: StandingRow[]): string[] {
  const counts = new Map<string, number>();
  for (const s of standings) {
    if (!s.archetype) continue;
    counts.set(s.archetype, (counts.get(s.archetype) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([archetype]) => archetype);
}

// ---------------------------------------------------------------------------
// Matriz de enfrentamientos arquetipo x arquetipo
// ---------------------------------------------------------------------------

export interface MatchupCell {
  wins: number;
  losses: number;
  draws: number;
  games: number;
  winratePct: number | null;
}

/**
 * mode "bo3" (partida): 1 victoria/derrota/empate por match, segun quien
 * gano la partida (best-of-3) completa.
 * mode "bo1" (juego individual): cada partida vale tantas victorias/
 * derrotas como juegos individuales se jugaron dentro de ella
 * (player_1_wins/player_2_wins) — un 2-1 cuenta como 2 juegos ganados por
 * un lado y 1 por el otro, no como "1 victoria" agregada.
 */
export function computeMatchupMatrix(
  matches: MatchRow[],
  mode: GameMode = "bo1"
): Map<string, Map<string, MatchupCell>> {
  const matrix = new Map<string, Map<string, MatchupCell>>();
  function bump(row: string, col: string, w: number, l: number, d: number) {
    if (!matrix.has(row)) matrix.set(row, new Map());
    const rowMap = matrix.get(row)!;
    const cur = rowMap.get(col) ?? { wins: 0, losses: 0, draws: 0, games: 0, winratePct: null };
    cur.wins += w;
    cur.losses += l;
    cur.draws += d;
    cur.games = cur.wins + cur.losses + cur.draws;
    cur.winratePct = winratePctOf(cur.wins, cur.losses);
    rowMap.set(col, cur);
  }
  for (const m of matches) {
    if (m.is_bye || !m.archetype_1 || !m.archetype_2) continue;
    if (mode === "bo1") {
      bump(m.archetype_1, m.archetype_2, m.player_1_wins, m.player_2_wins, 0);
      bump(m.archetype_2, m.archetype_1, m.player_2_wins, m.player_1_wins, 0);
    } else if (m.is_draw) {
      bump(m.archetype_1, m.archetype_2, 0, 0, 1);
      bump(m.archetype_2, m.archetype_1, 0, 0, 1);
    } else if (m.player_winner === 1) {
      bump(m.archetype_1, m.archetype_2, 1, 0, 0);
      bump(m.archetype_2, m.archetype_1, 0, 1, 0);
    } else if (m.player_winner === 2) {
      bump(m.archetype_1, m.archetype_2, 0, 1, 0);
      bump(m.archetype_2, m.archetype_1, 1, 0, 0);
    }
  }
  return matrix;
}

// ---------------------------------------------------------------------------
// Jugadores
// ---------------------------------------------------------------------------

export interface PlayerEntry {
  tournament_name: string;
  date: string;
  rank: number;
  archetype: string | null;
  deck_title: string | null;
  spiciness: number | null;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  list_view_url: string | null;
  visual_view_url: string | null;
  mtgdecks_url: string | null;
}

export interface PlayerStat {
  canonical_player_name: string;
  events: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  winratePct: number | null;
  avgSpiciness: number | null;
  entries: PlayerEntry[];
}

/** Tally de juegos individuales (bo1) por jugador, sumando
 * player_1_wins/player_2_wins de cada partida (no bye) en la que aparece —
 * opcionalmente separado por torneo, para el detalle expandible. */
function bo1TallyByPlayer(
  matches: MatchRow[],
  keyFn: (m: MatchRow, side: 1 | 2) => string
): Map<string, { wins: number; losses: number }> {
  const tally = new Map<string, { wins: number; losses: number }>();
  function bump(key: string, w: number, l: number) {
    const cur = tally.get(key) ?? { wins: 0, losses: 0 };
    cur.wins += w;
    cur.losses += l;
    tally.set(key, cur);
  }
  for (const m of matches) {
    if (m.is_bye) continue;
    bump(keyFn(m, 1), m.player_1_wins, m.player_2_wins);
    bump(keyFn(m, 2), m.player_2_wins, m.player_1_wins);
  }
  return tally;
}

export function computePlayerStats(
  standings: StandingRow[],
  matches: MatchRow[],
  tournaments: Tournament[],
  mode: GameMode = "bo3"
): PlayerStat[] {
  const urlByTournament = new Map(tournaments.map((t) => [t.tournament_name, t.mtgdecks_url]));

  const overallBo1 = bo1TallyByPlayer(matches, (m, side) =>
    side === 1 ? m.player_1_canonical : m.player_2_canonical
  );
  const perTournamentBo1 = bo1TallyByPlayer(matches, (m, side) =>
    `${side === 1 ? m.player_1_canonical : m.player_2_canonical}|${m.tournament_name}`
  );

  const byPlayer = new Map<string, PlayerStat>();
  for (const s of standings) {
    let p = byPlayer.get(s.canonical_player_name);
    if (!p) {
      p = {
        canonical_player_name: s.canonical_player_name,
        events: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        winratePct: null,
        avgSpiciness: null,
        entries: [],
      };
      byPlayer.set(s.canonical_player_name, p);
    }
    p.events += 1;
    p.points += s.points;

    const bo1Entry = perTournamentBo1.get(`${s.canonical_player_name}|${s.tournament_name}`);
    const entryWins = mode === "bo1" ? bo1Entry?.wins ?? 0 : s.wins;
    const entryLosses = mode === "bo1" ? bo1Entry?.losses ?? 0 : s.losses;
    const entryDraws = mode === "bo1" ? 0 : s.draws;

    p.entries.push({
      tournament_name: s.tournament_name,
      date: s.date,
      rank: s.rank,
      archetype: s.archetype,
      deck_title: s.deck_title,
      spiciness: s.spiciness,
      wins: entryWins,
      losses: entryLosses,
      draws: entryDraws,
      points: s.points,
      list_view_url: s.list_view_url,
      visual_view_url: s.visual_view_url,
      mtgdecks_url: urlByTournament.get(s.tournament_name) ?? null,
    });
  }

  return Array.from(byPlayer.values()).map((p) => {
    if (mode === "bo1") {
      const t = overallBo1.get(p.canonical_player_name) ?? { wins: 0, losses: 0 };
      p.wins = t.wins;
      p.losses = t.losses;
      p.draws = 0;
    } else {
      p.wins = p.entries.reduce((s, e) => s + e.wins, 0);
      p.losses = p.entries.reduce((s, e) => s + e.losses, 0);
      p.draws = p.entries.reduce((s, e) => s + e.draws, 0);
    }
    p.winratePct = winratePctOf(p.wins, p.losses);

    const spiciness = p.entries.map((e) => e.spiciness).filter((v): v is number => v !== null);
    p.avgSpiciness = spiciness.length > 0 ? spiciness.reduce((a, b) => a + b, 0) / spiciness.length : null;

    p.entries.sort((a, b) => a.date.localeCompare(b.date));
    return p;
  });
}

// ---------------------------------------------------------------------------
// Cartas
// ---------------------------------------------------------------------------

/** Los 6 tipos "de carta" que se pueden filtrar — deliberadamente no la
 * lista completa de tipos de Magic (p.ej. sin Planeswalker: pauper apenas
 * tiene). Una carta con varios de estos tipos en su type_line (p.ej. una
 * artifact land, o una artifact creature) pertenece a todos ellos. */
export const CORE_CARD_TYPES = ["Creature", "Artifact", "Enchantment", "Sorcery", "Instant", "Land"] as const;
export type CoreCardType = (typeof CORE_CARD_TYPES)[number];

function coreTypesOf(typeLine: string | null): CoreCardType[] {
  const tl = (typeLine ?? "").toLowerCase();
  return CORE_CARD_TYPES.filter((t) => tl.includes(t.toLowerCase()));
}

export interface CardStat {
  card_name: string;
  coreTypes: CoreCardType[];
  typeLabel: string;
  colors: string | null;
  rarity: string | null;
  image_url: string | null;
  decks: number;
  totalDecks: number;
  pctOfDecks: number;
  totalCopies: number;
  avgCopies: number;
}

/** No se distingue maindeck/sideboard: una carta cuenta igual jugada en
 * cualquiera de los dos, y sus copias se suman todas juntas. */
export function computeCardStats(cards: CardRow[], totalDecksInFilter: number): CardStat[] {
  interface Acc {
    coreTypes: CoreCardType[];
    colors: string | null;
    rarity: string | null;
    image_url: string | null;
    deckKeys: Set<string>;
    totalCopies: number;
  }
  const map = new Map<string, Acc>();
  for (const c of cards) {
    const deckKey = `${c.tournament_name}#${c.rank}`;
    let acc = map.get(c.card_name);
    if (!acc) {
      acc = {
        coreTypes: coreTypesOf(c.type_line),
        colors: c.colors,
        rarity: c.rarity,
        image_url: c.image_url,
        deckKeys: new Set(),
        totalCopies: 0,
      };
      map.set(c.card_name, acc);
    }
    acc.deckKeys.add(deckKey);
    acc.totalCopies += c.quantity;
    if (!acc.image_url && c.image_url) acc.image_url = c.image_url;
  }
  return Array.from(map.entries()).map(([card_name, acc]) => ({
    card_name,
    coreTypes: acc.coreTypes,
    typeLabel: acc.coreTypes.length > 0 ? acc.coreTypes.join(", ") : "—",
    colors: acc.colors,
    rarity: acc.rarity,
    image_url: acc.image_url,
    decks: acc.deckKeys.size,
    totalDecks: totalDecksInFilter,
    pctOfDecks: totalDecksInFilter > 0 ? (acc.deckKeys.size / totalDecksInFilter) * 100 : 0,
    totalCopies: acc.totalCopies,
    avgCopies: acc.deckKeys.size > 0 ? acc.totalCopies / acc.deckKeys.size : 0,
  }));
}
