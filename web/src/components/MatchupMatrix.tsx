import { useMemo, useState } from "react";
import type { MatchRow, StandingRow } from "../types";
import { computeArchetypeStats, computeMatchupMatrix, type ArchetypeStat, type GameMode } from "../lib/aggregate";
import { DIVERGING } from "../lib/palette";
import { useTheme } from "../lib/useTheme";

interface Props {
  standings: StandingRow[];
  stats: ArchetypeStat[];
  matches: MatchRow[];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function cellColor(winratePct: number | null, mode: "light" | "dark", weak = false): string {
  if (winratePct === null) return "transparent";
  const delta = winratePct - 50; // -50..50
  if (delta === 0) return weak ? "transparent" : DIVERGING.mid[mode];
  // Incluso un 53-54% se nota un poco: suelo de alpha visible en vez de
  // caer a gris plano hasta un umbral.
  const strength = weak ? 0.35 : 1;
  const alpha = Math.min(0.85, 0.16 + (Math.abs(delta) / 50) * 0.69) * strength;
  const [r, g, b] = hexToRgb(delta > 0 ? DIVERGING.cool[mode] : DIVERGING.warm[mode]);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function cellTextColor(winratePct: number | null, mode: "light" | "dark"): string {
  if (winratePct === null) return "var(--text-muted)";
  const delta = Math.abs(winratePct - 50);
  if (delta < 22) return mode === "dark" ? "#ffffff" : "#0b0b0b";
  return "#ffffff";
}

interface Selected {
  row: string;
  col: string;
}

export function MatchupMatrix({ standings, stats, matches }: Props) {
  const mode = useTheme();
  const [gameMode, setGameMode] = useState<GameMode>("bo1");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [focusedRow, setFocusedRow] = useState<string | null>(null);

  const matrix = useMemo(() => computeMatchupMatrix(matches, gameMode), [matches, gameMode]);
  const overall = useMemo(
    () => computeArchetypeStats(standings, matches, gameMode),
    [standings, matches, gameMode]
  );
  const overallWinrate = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const s of overall) m.set(s.archetype, s.winratePct);
    return m;
  }, [overall]);

  const axes = useMemo(
    () => [...stats].sort((a, b) => b.deckCount - a.deckCount).map((s) => s.archetype),
    [stats]
  );
  const rowAxes = focusedRow ? [focusedRow] : axes;

  function cellAt(row: string, col: string) {
    const isSelf = row === col;
    const cell = isSelf ? null : matrix.get(row)?.get(col) ?? null;
    const wr = cell?.winratePct ?? null;
    const empty = isSelf || !cell || cell.games === 0 || wr === null;
    return { cell, wr, empty };
  }

  const selectedInfo = selected ? cellAt(selected.row, selected.col) : null;
  const detailText = !selected
    ? "Toca o pasa el ratón sobre una celda para ver el detalle del cruce."
    : selectedInfo!.empty
      ? `${selected.row} vs ${selected.col}: sin partidas registradas.`
      : `${selected.row} vs ${selected.col}: ${selectedInfo!.cell!.wins}-${selectedInfo!.cell!.losses}-${selectedInfo!.cell!.draws} (${selectedInfo!.wr!.toFixed(0)}% winrate)`;

  return (
    <div>
      <div className="panel-controls">
        <button type="button" className={`chip${gameMode === "bo3" ? " active" : ""}`} onClick={() => setGameMode("bo3")}>
          BO3
        </button>
        <button type="button" className={`chip${gameMode === "bo1" ? " active" : ""}`} onClick={() => setGameMode("bo1")}>
          BO1
        </button>
        {focusedRow && (
          <button type="button" className="chip ghost" onClick={() => setFocusedRow(null)}>
            Ver todos los arquetipos
          </button>
        )}
      </div>
      <p className="panel-subtitle">{detailText}</p>

      {axes.length === 0 ? (
        <p className="panel-subtitle">Sin datos suficientes en este filtro.</p>
      ) : (
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
              {rowAxes.map((rowArchetype) => {
                const rowWr = overallWinrate.get(rowArchetype) ?? null;
                return (
                  <tr key={rowArchetype}>
                    <th
                      className={`row-head clickable${focusedRow === rowArchetype ? " focused" : ""}`}
                      title={`Ver solo los cruces de ${rowArchetype}`}
                      style={{ background: cellColor(rowWr, mode, true) }}
                      onClick={() => setFocusedRow((f) => (f === rowArchetype ? null : rowArchetype))}
                    >
                      <span className="axis-label">{rowArchetype}</span>
                      <span className="axis-winrate">{rowWr === null ? "" : `${Math.round(rowWr)}%`}</span>
                    </th>
                    {axes.map((colArchetype) => {
                      // La diagonal (arquetipo contra si mismo) no aporta
                      // informacion de matchup real (por definicion tiende
                      // a 50%) y ademas solo hay datos para los pocos
                      // arquetipos que alguna vez se han cruzado consigo
                      // mismo — para que la diagonal sea consistente para
                      // todos los arquetipos, se deja siempre en blanco.
                      const { cell, wr, empty } = cellAt(rowArchetype, colArchetype);
                      const title = empty
                        ? `${rowArchetype} vs ${colArchetype}: sin partidas registradas`
                        : `${rowArchetype} vs ${colArchetype}: ${cell!.wins}-${cell!.losses}-${cell!.draws} (${wr!.toFixed(0)}%)`;
                      const isSelected = selected?.row === rowArchetype && selected?.col === colArchetype;
                      return (
                        <td
                          key={colArchetype}
                          className={`matrix-cell${empty ? " empty" : ""}${isSelected ? " selected" : ""}`}
                          style={!empty ? { background: cellColor(wr, mode), color: cellTextColor(wr, mode) } : undefined}
                          title={title}
                          tabIndex={0}
                          onClick={() => setSelected({ row: rowArchetype, col: colArchetype })}
                          onFocus={() => setSelected({ row: rowArchetype, col: colArchetype })}
                        >
                          {empty ? "–" : `${Math.round(wr!)}%`}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
