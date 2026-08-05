import { useMemo, useState } from "react";
import type { MatchRow } from "../types";
import { computeMatchupMatrix, type ArchetypeStat, type GameMode } from "../lib/aggregate";
import { DIVERGING } from "../lib/palette";
import { useTheme } from "../lib/useTheme";

interface Props {
  stats: ArchetypeStat[];
  matches: MatchRow[];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function cellColor(winratePct: number | null, mode: "light" | "dark"): string {
  if (winratePct === null) return "transparent";
  const delta = winratePct - 50; // -50..50
  if (Math.abs(delta) < 4) return DIVERGING.mid[mode];
  const alpha = Math.min(0.85, 0.22 + (Math.abs(delta) / 50) * 0.63);
  const [r, g, b] = hexToRgb(delta > 0 ? DIVERGING.cool[mode] : DIVERGING.warm[mode]);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function cellTextColor(winratePct: number | null, mode: "light" | "dark"): string {
  if (winratePct === null) return "var(--text-muted)";
  const delta = Math.abs(winratePct - 50);
  if (delta < 22) return mode === "dark" ? "#ffffff" : "#0b0b0b";
  return "#ffffff";
}

export function MatchupMatrix({ stats, matches }: Props) {
  const mode = useTheme();
  const [gameMode, setGameMode] = useState<GameMode>("bo3");

  const matrix = useMemo(() => computeMatchupMatrix(matches, gameMode), [matches, gameMode]);

  const axes = useMemo(
    () => [...stats].sort((a, b) => b.deckCount - a.deckCount).map((s) => s.archetype),
    [stats]
  );

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

      {axes.length === 0 ? (
        <p className="panel-subtitle">Sin datos suficientes en este filtro.</p>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th />
                  {axes.map((a) => (
                    <th key={a} className="col-head" title={a}>
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {axes.map((rowArchetype) => (
                  <tr key={rowArchetype}>
                    <th className="row-head" title={rowArchetype}>
                      {rowArchetype}
                    </th>
                    {axes.map((colArchetype) => {
                      // La diagonal (arquetipo contra si mismo) no aporta
                      // informacion de matchup real (por definicion tiende
                      // a 50%) y ademas solo hay datos para los pocos
                      // arquetipos que alguna vez se han cruzado consigo
                      // mismo — para que la diagonal sea consistente para
                      // todos los arquetipos, se deja siempre en blanco.
                      const isSelf = rowArchetype === colArchetype;
                      const cell = isSelf ? null : matrix.get(rowArchetype)?.get(colArchetype) ?? null;
                      const wr = cell?.winratePct ?? null;
                      const empty = isSelf || !cell || cell.games === 0 || wr === null;
                      const title = empty
                        ? `${rowArchetype} vs ${colArchetype}: sin partidas registradas`
                        : `${rowArchetype} vs ${colArchetype}: ${cell.wins}-${cell.losses}-${cell.draws} (${wr!.toFixed(0)}%)`;
                      return (
                        <td
                          key={colArchetype}
                          className={`matrix-cell${empty ? " empty" : ""}`}
                          style={!empty ? { background: cellColor(wr, mode), color: cellTextColor(wr, mode) } : undefined}
                          title={title}
                        >
                          {empty ? "–" : `${Math.round(wr!)}%`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
