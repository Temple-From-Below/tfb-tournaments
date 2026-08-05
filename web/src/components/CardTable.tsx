import { useMemo, useState } from "react";
import type { CardStat } from "../lib/aggregate";
import { useSort, sortArrow } from "../lib/useSort";

const base = import.meta.env.BASE_URL;

interface Props {
  cards: CardStat[];
}

const columns: { key: keyof CardStat; label: string; dir?: "asc" | "desc" }[] = [
  { key: "card_name", label: "Carta", dir: "asc" },
  { key: "card_type", label: "Tipo", dir: "asc" },
  { key: "colors", label: "Color", dir: "asc" },
  { key: "decksMain", label: "Mazos" },
  { key: "pctOfDecks", label: "% Mazos" },
  { key: "avgCopiesMain", label: "Copias medias" },
  { key: "decksSide", label: "En banquillo" },
];

const COLOR_LABELS: Record<string, string> = {
  W: "Blanco",
  U: "Azul",
  B: "Negro",
  R: "Rojo",
  G: "Verde",
  C: "Incoloro",
};

export function CardTable({ cards }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");

  const types = useMemo(
    () => Array.from(new Set(cards.map((c) => c.card_type).filter(Boolean))).sort() as string[],
    [cards]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (q && !c.card_name.toLowerCase().includes(q)) return false;
      if (typeFilter && c.card_type !== typeFilter) return false;
      if (colorFilter) {
        const colors = c.colors ?? "";
        if (colorFilter === "M") {
          if (colors.length <= 1) return false;
        } else if (!colors.includes(colorFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [cards, search, typeFilter, colorFilter]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filtered, "decksMain", "desc");

  return (
    <div>
      <div className="panel-controls">
        <input
          type="text"
          placeholder="Buscar carta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)}>
          <option value="">Todos los colores</option>
          {Object.entries(COLOR_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
          <option value="M">Multicolor</option>
        </select>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`${c.key === "card_name" ? "left " : ""}${sortKey === c.key ? "sorted" : ""}`}
                  onClick={() => toggle(c.key, c.dir ?? "desc")}
                >
                  {c.label}
                  {sortArrow(sortKey === c.key, sortDir)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 200).map((c) => (
              <tr key={c.card_name}>
                <td className="left">
                  {c.image_url && (
                    <img className="card-thumb" src={`${base}${c.image_url}`} alt="" loading="lazy" />
                  )}
                  {c.card_name}
                </td>
                <td className="left">{c.card_type ?? "—"}</td>
                <td className="left">{c.colors || "—"}</td>
                <td className="num tabular">{c.decksMain}</td>
                <td className="num tabular">{c.pctOfDecks.toFixed(1)}%</td>
                <td className="num tabular">{c.avgCopiesMain.toFixed(1)}</td>
                <td className="num tabular">{c.decksSide}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 200 && (
        <p className="panel-subtitle">Mostrando las primeras 200 de {sorted.length} cartas. Afina la búsqueda para ver más.</p>
      )}
    </div>
  );
}
