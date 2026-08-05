import type { CardRow, MatchRow, StandingRow, Tournament } from "../types";

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

export function computeArchetypeStats(standings: StandingRow[], matches: MatchRow[]): ArchetypeStat[] {
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
      winratePct: games > 0 ? ((rec.wins + 0.5 * rec.draws) / games) * 100 : null,
    };
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

export function computeMatchupMatrix(
  matches: MatchRow[]
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
    cur.winratePct = cur.games > 0 ? ((cur.wins + 0.5 * cur.draws) / cur.games) * 100 : null;
    rowMap.set(col, cur);
  }
  for (const m of matches) {
    if (m.is_bye || !m.archetype_1 || !m.archetype_2) continue;
    if (m.is_draw) {
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
  entries: PlayerEntry[];
}

export function computePlayerStats(
  standings: StandingRow[],
  tournaments: Tournament[]
): PlayerStat[] {
  const urlByTournament = new Map(tournaments.map((t) => [t.tournament_name, t.mtgdecks_url]));
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
        entries: [],
      };
      byPlayer.set(s.canonical_player_name, p);
    }
    p.events += 1;
    p.wins += s.wins;
    p.losses += s.losses;
    p.draws += s.draws;
    p.points += s.points;
    p.entries.push({
      tournament_name: s.tournament_name,
      date: s.date,
      rank: s.rank,
      archetype: s.archetype,
      deck_title: s.deck_title,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      points: s.points,
      list_view_url: s.list_view_url,
      visual_view_url: s.visual_view_url,
      mtgdecks_url: urlByTournament.get(s.tournament_name) ?? null,
    });
  }
  return Array.from(byPlayer.values()).map((p) => {
    const games = p.wins + p.losses + p.draws;
    p.winratePct = games > 0 ? ((p.wins + 0.5 * p.draws) / games) * 100 : null;
    p.entries.sort((a, b) => a.date.localeCompare(b.date));
    return p;
  });
}

// ---------------------------------------------------------------------------
// Cartas
// ---------------------------------------------------------------------------

export interface CardStat {
  card_name: string;
  card_type: string | null;
  colors: string | null;
  rarity: string | null;
  image_url: string | null;
  decksMain: number;
  decksSide: number;
  totalDecks: number;
  pctOfDecks: number;
  totalCopiesMain: number;
  avgCopiesMain: number;
}

export function computeCardStats(cards: CardRow[], totalDecksInFilter: number): CardStat[] {
  interface Acc {
    card_type: string | null;
    colors: string | null;
    rarity: string | null;
    image_url: string | null;
    mainDeckKeys: Set<string>;
    sideDeckKeys: Set<string>;
    totalCopiesMain: number;
  }
  const map = new Map<string, Acc>();
  for (const c of cards) {
    const deckKey = `${c.tournament_name}#${c.rank}`;
    let acc = map.get(c.card_name);
    if (!acc) {
      acc = {
        card_type: c.card_type,
        colors: c.colors,
        rarity: c.rarity,
        image_url: c.image_url,
        mainDeckKeys: new Set(),
        sideDeckKeys: new Set(),
        totalCopiesMain: 0,
      };
      map.set(c.card_name, acc);
    }
    if (c.section === "maindeck") {
      acc.mainDeckKeys.add(deckKey);
      acc.totalCopiesMain += c.quantity;
    } else {
      acc.sideDeckKeys.add(deckKey);
    }
    if (!acc.image_url && c.image_url) acc.image_url = c.image_url;
  }
  return Array.from(map.entries()).map(([card_name, acc]) => ({
    card_name,
    card_type: acc.card_type,
    colors: acc.colors,
    rarity: acc.rarity,
    image_url: acc.image_url,
    decksMain: acc.mainDeckKeys.size,
    decksSide: acc.sideDeckKeys.size,
    totalDecks: totalDecksInFilter,
    pctOfDecks: totalDecksInFilter > 0 ? (acc.mainDeckKeys.size / totalDecksInFilter) * 100 : 0,
    totalCopiesMain: acc.totalCopiesMain,
    avgCopiesMain: acc.mainDeckKeys.size > 0 ? acc.totalCopiesMain / acc.mainDeckKeys.size : 0,
  }));
}
