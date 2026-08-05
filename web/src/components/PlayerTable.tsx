import { Fragment, useState } from "react";
import type { PlayerStat } from "../lib/aggregate";
import { useSort, sortArrow } from "../lib/useSort";

interface Props {
  players: PlayerStat[];
}

const columns: { key: keyof PlayerStat; label: string; dir?: "asc" | "desc" }[] = [
  { key: "canonical_player_name", label: "Jugador", dir: "asc" },
  { key: "events", label: "Eventos" },
  { key: "wins", label: "V" },
  { key: "losses", label: "D" },
  { key: "draws", label: "E" },
  { key: "points", label: "Puntos" },
  { key: "winratePct", label: "Winrate" },
];

export function PlayerTable({ players }: Props) {
  const { sorted, sortKey, sortDir, toggle } = useSort(players, "wins", "desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
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
                <tr
                  key={p.canonical_player_name}
                  onClick={() => setExpanded(isOpen ? null : p.canonical_player_name)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="left">{isOpen ? "▾ " : "▸ "}{p.canonical_player_name}</td>
                  <td className="num">{p.events}</td>
                  <td className="num tabular">{p.wins}</td>
                  <td className="num tabular">{p.losses}</td>
                  <td className="num tabular">{p.draws}</td>
                  <td className="num tabular">{p.points}</td>
                  <td className="num tabular">
                    {p.winratePct === null ? "—" : `${p.winratePct.toFixed(1)}%`}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="player-detail-row" key={`${p.canonical_player_name}-detail`}>
                    <td colSpan={columns.length}>
                      {p.entries.map((e) => (
                        <span className="entry" key={`${e.tournament_name}-${e.rank}`}>
                          <span className="pill">{e.tournament_name.replace("Mensual ", "")}</span>
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
                        </span>
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
  );
}
