interface Props {
  tournamentCount: number;
  deckCount: number;
  archetypeCount: number;
  playerCount: number;
  matchCount: number;
}

export function KpiRow({ tournamentCount, deckCount, archetypeCount, playerCount, matchCount }: Props) {
  const tiles = [
    { label: "Torneos", value: tournamentCount },
    { label: "Mazos", value: deckCount },
    { label: "Arquetipos", value: archetypeCount },
    { label: "Jugadores", value: playerCount },
    { label: "Partidas", value: matchCount },
  ];
  return (
    <div className="kpi-row">
      {tiles.map((t) => (
        <div className="kpi-tile" key={t.label}>
          <div className="kpi-label">{t.label}</div>
          <div className="kpi-value">{t.value}</div>
        </div>
      ))}
    </div>
  );
}
