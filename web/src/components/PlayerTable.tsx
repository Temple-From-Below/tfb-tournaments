import { Fragment, useMemo, useState } from "react";
import type { MatchRow, StandingRow, Tournament } from "../types";
import { computePlayerStats, type GameMode, type PlayerStat } from "../lib/aggregate";
import { useSort, sortArrow } from "../lib/useSort";

interface Props {
  standings: StandingRow[];
  matches: MatchRow[];
  tournaments: Tournament[];
}

const columns: { key: keyof PlayerStat; label: string; dir?: "asc" | "desc" }[] = [
  { key: "canonical_player_name", label: "Jugador", dir: "asc" },
  { key: "events", label: "Eventos" },
  { key: "wins", label: "V" },
  { key: "losses", label: "D" },
  { key: "draws", label: "E" },
  { key: "points", label: "Puntos" },
  { key: "winratePct", label: "Winrate" },
  { key: "avgSpiciness", label: "Spiciness media" },
];

export function PlayerTable({ standings, matches, tournaments }: Props) {
  const [gameMode, setGameMode] = useState<GameMode>("bo3");
  const players = useMemo(
    () => computePlayerStats(standings, matches, tournaments, gameMode),
    [standings, matches, tournaments, gameMode]
  );
  const { sorted, sortKey, sortDir, toggle } = useSort(players, "points", "desc", (k) =>
    k === "points"
      ? [
          { key: "winratePct", dir: "desc" },
          { key: "avgSpiciness", dir: "desc" },
        ]
      : undefined
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <div className="panel-controls">
        <button type="button" className={`chip${gameMode === "bo3" ? " active" : ""}`} onClick={() => setGameMode("bo3")}>
          BO3
        </button>
        <button type="button" className={`chip${gameMode === "bo1" ? " active" : ""}`} onClick={() => setGameMode("bo1")}>
          BO1
        </button>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`${c.key === "canonical_player_name" ? "left " : ""}${sortKey === c.key ? "sorted" : ""}`}
                  onClick={() => toggle(c.key, c.dir ?? "desc")}
                >
                  {c.label}
                  {sortArrow(sortKey === c.key, sortDir)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const isOpen = expanded === p.canonical_player_name;
              return (
                <Fragment key={p.canonical_player_name}>
                  <tr onClick={() => setExpanded(isOpen ? null : p.canonical_player_name)} style={{ cursor: "pointer" }}>
                    <td className="left">
                      {isOpen ? "▾ " : "▸ "}
                      {p.canonical_player_name}
                    </td>
                    <td className="num">{p.events}</td>
                    <td className="num tabular">{p.wins}</td>
                    <td className="num tabular">{p.losses}</td>
                    <td className="num tabular">{p.draws}</td>
                    <td className="num tabular">{p.points}</td>
                    <td className="num tabular">{p.winratePct === null ? "—" : `${p.winratePct.toFixed(1)}%`}</td>
                    <td className="num tabular">{p.avgSpiciness === null ? "—" : p.avgSpiciness.toFixed(0)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="player-detail-row">
                      <td colSpan={columns.length}>
                        {p.entries.map((e) => (
                          <div className="entry" key={`${e.tournament_name}-${e.rank}`}>
                            <span className="pill">{e.tournament_name}</span>
                            #{e.rank} · {e.archetype ?? "sin arquetipo"} ({e.wins}-{e.losses}-{e.draws})
                            {e.list_view_url && (
                              <>
                                {" "}
                                ·{" "}
                                <a href={e.list_view_url} target="_blank" rel="noreferrer">
                                  lista
                                </a>
                              </>
                            )}
                            {e.visual_view_url && (
                              <>
                                {" "}
                                ·{" "}
                                <a href={e.visual_view_url} target="_blank" rel="noreferrer">
                                  visual
                                </a>
                              </>
                            )}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
