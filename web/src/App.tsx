import { useEffect, useMemo, useState } from "react";
import { useData } from "./lib/useData";
import { computeArchetypeStats, computeCardStats, globalArchetypeRankingDesc } from "./lib/aggregate";
import { buildArchetypeColorScale } from "./lib/palette";
import { Filters } from "./components/Filters";
import { KpiRow } from "./components/KpiRow";
import { ArchetypeMetaTable } from "./components/ArchetypeMetaTable";
import { MatchupMatrix } from "./components/MatchupMatrix";
import { PlayerTable } from "./components/PlayerTable";
import { CardTable } from "./components/CardTable";
import { TournamentLinks } from "./components/TournamentLinks";

export default function App() {
  const state = useData();
  const [selectedTournaments, setSelectedTournaments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (state.status === "ready" && selectedTournaments.size === 0) {
      setSelectedTournaments(new Set(state.data.tournaments.map((t) => t.tournament_name)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const colorScale = useMemo(() => {
    if (state.status !== "ready") return new Map<string, number>();
    return buildArchetypeColorScale(globalArchetypeRankingDesc(state.data.standings));
  }, [state.status === "ready" ? state.data.standings : null]);

  const filtered = useMemo(() => {
    if (state.status !== "ready") return null;
    const { tournaments, standings, matches, cards } = state.data;
    const sel = selectedTournaments;
    const f = {
      tournaments: tournaments.filter((t) => sel.has(t.tournament_name)),
      standings: standings.filter((s) => sel.has(s.tournament_name)),
      matches: matches.filter((m) => sel.has(m.tournament_name)),
      cards: cards.filter((c) => sel.has(c.tournament_name)),
    };
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status === "ready" ? state.data : null, selectedTournaments]);

  if (state.status === "loading") {
    return <div className="app state-message">Cargando datos…</div>;
  }
  if (state.status === "error") {
    return <div className="app state-message">Error cargando datos: {state.error}</div>;
  }
  if (!filtered) return null;

  const archetypeStats = computeArchetypeStats(filtered.standings, filtered.matches);
  const playerCount = new Set(filtered.standings.map((s) => s.canonical_player_name)).size;
  const totalDecksInFilter = filtered.standings.length;
  const cardStats = computeCardStats(filtered.cards, totalDecksInFilter);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Temple From Below · Pauper</h1>
        <span className="subtitle">Clasificaciones, metagame y listas de los torneos mensuales</span>
      </header>
      <TournamentLinks tournaments={state.data.tournaments} />

      <Filters
        tournaments={state.data.tournaments}
        selected={selectedTournaments}
        onChange={setSelectedTournaments}
      />

      <KpiRow
        tournamentCount={filtered.tournaments.length}
        deckCount={filtered.standings.length}
        playerCount={playerCount}
        matchCount={filtered.matches.filter((m) => !m.is_bye).length}
      />

      <section className="panel">
        <h2>Metagame</h2>
        <p className="panel-subtitle">
          Cuota de cada arquetipo (mazos sin arquetipo asignado en mtgdecks cuentan como su propio
          nombre de mazo). Ordena por columna.
        </p>
        <ArchetypeMetaTable stats={archetypeStats} colorScale={colorScale} />
      </section>

      <section className="panel">
        <h2>Matriz de enfrentamientos</h2>
        <p className="panel-subtitle">
          Winrate de la fila contra la columna (los empates no cuentan, ni a favor ni en contra). Pasa
          el ratón sobre una celda para ver el balance V-D-E.
        </p>
        <MatchupMatrix stats={archetypeStats} matches={filtered.matches} />
      </section>

      <section className="panel">
        <h2>Jugadores</h2>
        <p className="panel-subtitle">Ordenado por victorias totales. Haz clic en un jugador para ver su historial.</p>
        <PlayerTable standings={filtered.standings} matches={filtered.matches} tournaments={filtered.tournaments} />
      </section>

      <section className="panel">
        <h2>Cartas</h2>
        <p className="panel-subtitle">Cartas jugadas en el mazo principal, con % de mazos que las incluyen.</p>
        <CardTable cards={cardStats} />
      </section>

      <p className="footer-note">
        Datos de{" "}
        <a href="https://www.aetherhub.com/" target="_blank" rel="noreferrer">
          AetherHub
        </a>{" "}
        y{" "}
        <a href="https://mtgdecks.net/Pauper" target="_blank" rel="noreferrer">
          mtgdecks.net
        </a>
        . El cruce entre clasificación y listas de mtgdecks se hace por posición final de cada
        torneo; en caso de empate en la fase final, la correspondencia puede no ser exacta.
      </p>
    </div>
  );
}
