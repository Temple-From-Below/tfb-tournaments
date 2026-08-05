import { useMemo } from "react";
import type { ArchetypeStat, MatchupCell } from "../lib/aggregate";
import { DIVERGING } from "../lib/palette";
import { useTheme } from "../lib/useTheme";

interface Props {
  stats: ArchetypeStat[];
  matrix: Map<string, Map<string, MatchupCell>>;
  maxAxes?: number;
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

export function MatchupMatrix({ stats, matrix, maxAxes = 12 }: Props) {
  const mode = useTheme();

  const axes = useMemo(
    () =>
      [...stats]
        .sort((a, b) => b.deckCount - a.deckCount)
        .slice(0, maxAxes)
        .map((s) => s.archetype),
    [stats, maxAxes]
  );

  if (axes.length === 0) {
    return <p className="panel-subtitle">Sin datos suficientes en este filtro.</p>;
  }

  return (
    <div>
      {stats.length > maxAxes && (
        <p className="panel-subtitle">
          Se muestran los {maxAxes} arquetipos con más mazos en el filtro actual (de {stats.length}).
        </p>
      )}
      <div className="legend">
        <span className="legend-item">
          <span className="swatch" style={{ background: DIVERGING.warm[mode] }} /> Winrate bajo
        </span>
        <span className="legend-item">
          <span className="swatch" style={{ background: DIVERGING.mid[mode] }} /> ≈ 50%
        </span>
        <span className="legend-item">
          <span className="swatch" style={{ background: DIVERGING.cool[mode] }} /> Winrate alto
        </span>
      </div>
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
                  const cell = matrix.get(rowArchetype)?.get(colArchetype) ?? null;
                  const wr = cell?.winratePct ?? null;
                  const empty = !cell || cell.games === 0;
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
    </div>
  );
}
