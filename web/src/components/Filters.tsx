import type { Tournament } from "../types";
import { abbreviateTournamentName } from "../lib/tournamentNames";

interface Props {
  tournaments: Tournament[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function Filters({ tournaments, selected, onChange }: Props) {
  function toggle(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(next);
  }

  const allSelected = selected.size === tournaments.length;
  const sorted = [...tournaments].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="filters-block" role="group" aria-label="Filtro por torneo">
      <span className="filters-label">Torneos</span>
      <div className="filters-row">
        {sorted.map((t) => (
          <button
            key={t.tournament_name}
            type="button"
            className={`chip${selected.has(t.tournament_name) ? " active" : ""}`}
            onClick={() => toggle(t.tournament_name)}
            title={`${t.tournament_name} (${t.date})`}
          >
            {abbreviateTournamentName(t.tournament_name)}
          </button>
        ))}
        <button
          type="button"
          className="chip ghost"
          onClick={() => onChange(allSelected ? new Set() : new Set(tournaments.map((t) => t.tournament_name)))}
        >
          {allSelected ? "Ninguno" : "Todos"}
        </button>
      </div>
    </div>
  );
}
