import type { ArchetypeStat } from "../lib/aggregate";
import { colorForSlot } from "../lib/palette";
import { useSort, sortArrow } from "../lib/useSort";
import { useTheme } from "../lib/useTheme";

interface Props {
  stats: ArchetypeStat[];
  colorScale: Map<string, number | null>;
}

const columns: { key: keyof ArchetypeStat; label: string; dir?: "asc" | "desc" }[] = [
  { key: "archetype", label: "Arquetipo", dir: "asc" },
  { key: "deckCount", label: "Mazos" },
  { key: "metaSharePct", label: "% Meta" },
  { key: "wins", label: "V" },
  { key: "losses", label: "D" },
  { key: "draws", label: "E" },
  { key: "winratePct", label: "Winrate" },
];

export function ArchetypeTable({ stats, colorScale }: Props) {
  const mode = useTheme();
  const { sorted, sortKey, sortDir, toggle } = useSort(stats, "metaSharePct", "desc");

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
          {sorted.map((r) => (
            <tr key={r.archetype}>
              <td className="left">
                <span className="swatch" style={{ background: colorForSlot(colorScale.get(r.archetype) ?? null, mode) }} />
                {r.archetype}
              </td>
              <td className="num">{r.deckCount}</td>
              <td className="num tabular">{r.metaSharePct.toFixed(1)}%</td>
              <td className="num tabular">{r.wins}</td>
              <td className="num tabular">{r.losses}</td>
              <td className="num tabular">{r.draws}</td>
              <td className="num tabular">{r.winratePct === null ? "—" : `${r.winratePct.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
