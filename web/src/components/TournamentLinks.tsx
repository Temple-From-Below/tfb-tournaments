import type { Tournament } from "../types";

export function TournamentLinks({ tournaments }: { tournaments: Tournament[] }) {
  const sorted = [...tournaments].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="tournament-links">
      {sorted.map((t) => (
        <span key={t.tournament_name}>
          <a href={t.mtgdecks_url} target="_blank" rel="noreferrer">
            {t.tournament_name}
          </a>{" "}
          ({t.date} · {t.player_count} jugadores)
        </span>
      ))}
    </div>
  );
}
