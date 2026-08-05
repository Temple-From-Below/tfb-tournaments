import { useEffect, useMemo, useState } from "react";
import { useData } from "./lib/useData";
import {
  computeArchetypeStats,
  computeCardStats,
  computeMatchupMatrix,
  computePlayerStats,
  globalArchetypeRankingDesc,
} from "./lib/aggregate";
import { buildArchetypeColorScale } from "./lib/palette";
import { Filters } from "./components/Filters";
import { KpiRow } from "./components/KpiRow";
import { MetaShareChart } from "./components/MetaShareChart";
import { ArchetypeTable } from "./components/ArchetypeTable";
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
    if (state.status !== "ready") return new Map<string, number | null>();
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
  const matchupMatrix = computeMatchupMatrix(filtered.matches);
  const playerStats = computePlayerStats(filtered.standings, filtered.tournaments);
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
        playerCount={playerStats.length}
        matchCount={filtered.matches.filter((m) => !m.is_bye).length}
      />

      <section className="panel">
        <h2>Metagame</h2>
        <p className="panel-subtitle">Cuota de cada arquetipo entre los mazos con arquetipo conocido.</p>
        <MetaShareChart stats={archetypeStats} colorScale={colorScale} />
      </section>

      <section className="panel">
        <h2>Arquetipos</h2>
        <p className="panel-subtitle">Ordena por columna — % de meta o winrate, por ejemplo.</p>
        <ArchetypeTable stats={archetypeStats} colorScale={colorScale} />
      </section>

      <section className="panel">
        <h2>Matriz de enfrentamientos</h2>
        <p className="panel-subtitle">
          Winrate de la fila contra la columna (empates cuentan medio punto). Pasa el ratón sobre una
          celda para ver el balance V-D-E.
        </p>
        <MatchupMatrix stats={archetypeStats} matrix={matchupMatrix} />
      </section>

      <section className="panel">
        <h2>Jugadores</h2>
        <p className="panel-subtitle">Ordenado por victorias totales. Haz clic en un jugador para ver su historial.</p>
        <PlayerTable players={playerStats} />
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
