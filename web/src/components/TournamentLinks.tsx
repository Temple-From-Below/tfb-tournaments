import type { Tournament } from "../types";

export function TournamentLinks({ tournaments }: { tournaments: Tournament[] }) {
  const sorted = [...tournaments].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="tournament-links">
      {sorted.map((t) => (
        <a key={t.tournament_name} href={t.mtgdecks_url} target="_blank" rel="noreferrer">
          {t.tournament_name}
        </a>
      ))}
    </div>
  );
}
