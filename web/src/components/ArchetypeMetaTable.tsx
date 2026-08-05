import type { ArchetypeStat } from "../lib/aggregate";
import { colorForSlot } from "../lib/palette";
import { useSort, sortArrow } from "../lib/useSort";
import { useTheme } from "../lib/useTheme";

interface Props {
  stats: ArchetypeStat[];
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

export function ArchetypeMetaTable({ stats, colorScale }: Props) {
  const mode = useTheme();
  const { sorted, sortKey, sortDir, toggle } = useSort(stats, "metaSharePct", "desc");
  const maxShare = Math.max(1, ...stats.map((s) => s.metaSharePct));

  if (stats.length === 0) {
    return <p className="panel-subtitle">Sin mazos en este filtro.</p>;
  }

  return (
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
            return (
              <tr key={r.archetype}>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
