import { useMemo } from "react";
import type { ArchetypeStat } from "../lib/aggregate";
import { colorForSlot } from "../lib/palette";
import { useTheme } from "../lib/useTheme";

interface Props {
  stats: ArchetypeStat[];
  colorScale: Map<string, number | null>;
  maxRows?: number;
}

export function MetaShareChart({ stats, colorScale, maxRows = 10 }: Props) {
  const mode = useTheme();

  const rows = useMemo(() => {
    const sorted = [...stats].sort((a, b) => b.metaSharePct - a.metaSharePct);
    if (sorted.length <= maxRows) return sorted;
    const head = sorted.slice(0, maxRows);
    const tail = sorted.slice(maxRows);
    const other: ArchetypeStat = {
      archetype: `Otros (${tail.length})`,
      deckCount: tail.reduce((s, r) => s + r.deckCount, 0),
      metaSharePct: tail.reduce((s, r) => s + r.metaSharePct, 0),
      wins: tail.reduce((s, r) => s + r.wins, 0),
      losses: tail.reduce((s, r) => s + r.losses, 0),
      draws: tail.reduce((s, r) => s + r.draws, 0),
      games: tail.reduce((s, r) => s + r.games, 0),
      winratePct: null,
    };
    return [...head, other];
  }, [stats, maxRows]);

  const maxShare = Math.max(1, ...rows.map((r) => r.metaSharePct));

  if (stats.length === 0) {
    return <p className="panel-subtitle">Sin mazos con arquetipo conocido en este filtro.</p>;
  }

  return (
    <div>
      {rows.map((r) => {
        const slot = colorScale.get(r.archetype) ?? null;
        const color = r.archetype.startsWith("Otros (") ? colorForSlot(null, mode) : colorForSlot(slot, mode);
        return (
          <div className="hbar-row" key={r.archetype}>
            <div className="hbar-label" title={r.archetype}>
              <span className="swatch" style={{ background: color }} />
              {r.archetype}
            </div>
            <div className="hbar-track">
              <div
                className="hbar-fill"
                style={{ width: `${(r.metaSharePct / maxShare) * 100}%`, background: color }}
              />
            </div>
            <div className="hbar-value">{r.metaSharePct.toFixed(1)}%</div>
          </div>
        );
      })}
    </div>
  );
}
