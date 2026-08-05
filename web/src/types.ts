export interface Tournament {
  tournament_name: string;
  format: string;
  date: string;
  mtgdecks_url: string;
  player_count: number;
}

export interface StandingRow {
  tournament_name: string;
  date: string;
  format: string;
  rank: number;
  name: string;
  canonical_player_name: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  omw: number | null;
  gw: number | null;
  ogw: number | null;
  archetype: string | null;
  deck_title: string | null;
  spiciness: number | null;
  price_paper_usd: number | null;
  player_name_mtgdecks: string | null;
  decklist_id: string | null;
  list_view_url: string | null;
  visual_view_url: string | null;
  rank_label: string | null;
}

export interface MatchRow {
  tournament_name: string;
  date: string;
  format: string;
  round: number;
  table: number;
  player_1: string;
  player_1_canonical: string;
  archetype_1: string | null;
  points_player_1: number;
  player_2: string;
  player_2_canonical: string;
  archetype_2: string | null;
  points_player_2: number;
  match_results: string;
  player_1_wins: number;
  player_2_wins: number;
  player_winner: number | null;
  player_name_winner: string | null;
  player_name_winner_canonical: string | null;
  is_draw: boolean;
  is_bye: boolean;
}

export interface CardRow {
  tournament_name: string;
  date: string;
  format: string;
  rank: number;
  decklist_id: string;
  canonical_player_name: string;
  player_name_mtgdecks: string | null;
  archetype: string | null;
  deck_title: string | null;
  section: "maindeck" | "sideboard";
  card_type: string | null;
  quantity: number;
  card_name: string;
  type_line: string | null;
  rarity: string | null;
  colors: string | null;
  image_url: string | null;
}
