import { useMemo, useState } from "react";
import { CORE_CARD_TYPES, type CardStat } from "../lib/aggregate";
import { useSort, sortArrow } from "../lib/useSort";
import { MultiSelect } from "./MultiSelect";

const base = import.meta.env.BASE_URL;

interface Props {
  cards: CardStat[];
}

const columns: { key: keyof CardStat; label: string; dir?: "asc" | "desc"; left?: boolean }[] = [
  { key: "card_name", label: "Carta", dir: "asc", left: true },
  { key: "typeLabel", label: "Tipo", dir: "asc", left: true },
  { key: "colors", label: "Color", dir: "asc", left: true },
  { key: "decks", label: "Mazos" },
  { key: "pctOfDecks", label: "% Mazos" },
  { key: "totalCopies", label: "Total cartas" },
  { key: "avgCopies", label: "Copias medias" },
];

const TYPE_OPTIONS = CORE_CARD_TYPES.map((t) => ({ key: t, label: t }));

const COLOR_OPTIONS: { key: string; label: string }[] = [
  { key: "W", label: "Blanco" },
  { key: "U", label: "Azul" },
  { key: "B", label: "Negro" },
  { key: "R", label: "Rojo" },
  { key: "G", label: "Verde" },
  { key: "C", label: "Incoloro" },
  { key: "M", label: "Multicolor" },
];

export function CardTable({ cards }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [colorFilters, setColorFilters] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (q && !c.card_name.toLowerCase().includes(q)) return false;
      if (typeFilters.size > 0 && !c.coreTypes.some((t) => typeFilters.has(t))) return false;
      if (colorFilters.size > 0) {
        const colors = c.colors ?? "";
        const matches = Array.from(colorFilters).some((f) =>
          f === "M" ? colors.length > 1 : colors.includes(f)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [cards, search, typeFilters, colorFilters]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filtered, "decks", "desc");

  return (
    <div>
      <div className="panel-controls">
        <input
          type="text"
          placeholder="Buscar carta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <MultiSelect
          placeholder="Todos los tipos"
          options={TYPE_OPTIONS}
          selected={typeFilters}
          onChange={setTypeFilters}
        />
        <MultiSelect
          placeholder="Todos los colores"
          options={COLOR_OPTIONS}
          selected={colorFilters}
          onChange={setColorFilters}
        />
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`${c.left ? "left " : ""}${sortKey === c.key ? "sorted" : ""}`}
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
                <td className="left">{c.typeLabel}</td>
                <td className="left">{c.colors || "—"}</td>
                <td className="num tabular">{c.decks}</td>
                <td className="num tabular">{c.pctOfDecks.toFixed(1)}%</td>
                <td className="num tabular">{c.totalCopies}</td>
                <td className="num tabular">{c.avgCopies.toFixed(1)}</td>
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
