import { Fragment, useMemo, useState } from "react";
import type { MatchRow, StandingRow } from "../types";
import { computeArchetypeStats, type GameMode, type ArchetypeStat } from "../lib/aggregate";
import { colorForSlot } from "../lib/palette";
import { useSort, sortArrow } from "../lib/useSort";
import { useTheme } from "../lib/useTheme";

interface Props {
  standings: StandingRow[];
  matches: MatchRow[];
  colorScale: Map<string, number>;
}

const columns: { key: keyof ArchetypeStat; label: string; dir?: "asc" | "desc" }[] = [
  { key: "archetype", label: "Arquetipo", dir: "asc" },
  { key: "metaSharePct", label: "% Meta" },
  { key: "deckCount", label: "Mazos" },
  { key: "wins", label: "V" },
  { key: "losses", label: "D" },
  { key: "draws", label: "E" },
  { key: "winratePct", label: "Winrate" },
];

export function ArchetypeMetaTable({ standings, matches, colorScale }: Props) {
  const mode = useTheme();
  const [gameMode, setGameMode] = useState<GameMode>("bo3");
  const [expanded, setExpanded] = useState<string | null>(null);
  const stats = useMemo(
    () => computeArchetypeStats(standings, matches, gameMode),
    [standings, matches, gameMode]
  );
  const { sorted, sortKey, sortDir, toggle } = useSort(stats, "metaSharePct", "desc", (k) => {
    const winLossChain: { key: keyof ArchetypeStat; dir: "asc" | "desc" }[] = [
      { key: "wins", dir: "desc" },
      { key: "losses", dir: "asc" },
    ];
    if (k === "metaSharePct") return [{ key: "winratePct", dir: "desc" }, ...winLossChain];
    if (k === "winratePct") return [{ key: "metaSharePct", dir: "desc" }, ...winLossChain];
    return undefined;
  });
  const maxShare = Math.max(1, ...stats.map((s) => s.metaSharePct));

  const decksByArchetype = useMemo(() => {
    const map = new Map<string, StandingRow[]>();
    for (const s of standings) {
      if (!s.archetype) continue;
      const list = map.get(s.archetype) ?? [];
      list.push(s);
      map.set(s.archetype, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [standings]);

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
      {stats.length === 0 ? (
        <p className="panel-subtitle">Sin mazos en este filtro.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`${c.key === "archetype" ? "left " : ""}${sortKey === c.key ? "sorted" : ""}`}
                    onClick={() => toggle(c.key, c.dir ?? "desc")}
                  >
                    {c.label}
                    {sortArrow(sortKey === c.key, sortDir)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const color = colorForSlot(colorScale.get(r.archetype) ?? null, mode);
                const isOpen = expanded === r.archetype;
                const decks = decksByArchetype.get(r.archetype) ?? [];
                return (
                  <Fragment key={r.archetype}>
                    <tr onClick={() => setExpanded(isOpen ? null : r.archetype)} style={{ cursor: "pointer" }}>
                      <td className="left">
                        <span className="swatch" style={{ background: color }} />
                        {r.archetype}
                      </td>
                      <td className="num">
                        <div className="hbar-row" style={{ gridTemplateColumns: "1fr 56px", padding: 0 }}>
                          <div className="hbar-track">
                            <div
                              className="hbar-fill"
                              style={{ width: `${(r.metaSharePct / maxShare) * 100}%`, background: color }}
                            />
                          </div>
                          <div className="hbar-value">{r.metaSharePct.toFixed(1)}%</div>
                        </div>
                      </td>
                      <td className="num tabular">{r.deckCount}</td>
                      <td className="num tabular">{r.wins}</td>
                      <td className="num tabular">{r.losses}</td>
                      <td className="num tabular">{r.draws}</td>
                      <td className="num tabular">{r.winratePct === null ? "—" : `${r.winratePct.toFixed(1)}%`}</td>
                    </tr>
                    {isOpen && (
                      <tr className="player-detail-row">
                        <td colSpan={columns.length}>
                          {decks.map((d) => (
                            <div className="entry" key={`${d.tournament_name}-${d.rank}`}>
                              <span className="pill">{d.tournament_name}</span>
                              #{d.rank} · {d.canonical_player_name} ({d.wins}-{d.losses}-{d.draws})
                              {d.list_view_url && (
                                <>
                                  {" "}
                                  ·{" "}
                                  <a href={d.list_view_url} target="_blank" rel="noreferrer">
                                    lista
                                  </a>
                                </>
                              )}
                              {d.visual_view_url && (
                                <>
                                  {" "}
                                  ·{" "}
                                  <a href={d.visual_view_url} target="_blank" rel="noreferrer">
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
      )}
    </div>
  );
}
