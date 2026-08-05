"""Pipeline de agregacion: une los CSV de data/ y genera JSON limpios para
la web (web/public/data/*.json).

Entradas (todas en data/):
  - tournaments_info.csv          torneo, fecha, formato, url mtgdecks
  - tournament_standings.csv      clasificacion por torneo
  - tournament_pairings.csv       emparejamientos/resultados por ronda
  - tournaments_info_mtgdecks.csv arquetipo/deck por torneo (scrapeado)
  - lists_mtgdecks.csv            cartas por deck (scrapeado)
  - player_aliases.csv            mapeo nombre crudo -> jugador canonico

Salidas (en web/public/data/):
  - tournaments.json  lista de torneos
  - standings.json     clasificacion enriquecida (jugador canonico + arquetipo)
  - matches.json        pairings enriquecidos (arquetipo de cada lado)
  - cards.json           cartas jugadas, enriquecidas

Uso:
    .venv\\Scripts\\python.exe scripts\\build_dataset.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "web" / "public" / "data"


def to_float_eu(series: pd.Series) -> pd.Series:
    """Convierte una columna con decimales en formato europeo ('60,4167')
    o ya numerico a float."""
    return pd.to_numeric(
        series.astype(str).str.replace(",", ".", regex=False), errors="coerce"
    )


def clean_nan(obj):
    """Sustituye NaN/NaT por None recursivamente para que json.dumps no
    escriba 'NaN' (invalido en JSON estricto)."""
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    if isinstance(obj, float) and np.isnan(obj):
        return None
    return obj


def write_json(name: str, records: list[dict]):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    with open(path, "w", encoding="utf-8") as f:
        json.dump(clean_nan(records), f, ensure_ascii=False, indent=None, separators=(",", ":"))
    print(f"  {name}: {len(records)} filas -> {path}")


def load_aliases() -> dict[str, str]:
    df = pd.read_csv(DATA / "player_aliases.csv")
    return dict(zip(df["raw_name"], df["canonical_player_name"]))


def main():
    print("Cargando CSV...")
    tournaments = pd.read_csv(DATA / "tournaments_info.csv")
    standings = pd.read_csv(DATA / "tournament_standings.csv")
    pairings = pd.read_csv(DATA / "tournament_pairings.csv")
    decks = pd.read_csv(DATA / "tournaments_info_mtgdecks.csv")
    cards = pd.read_csv(DATA / "lists_mtgdecks.csv")
    aliases = load_aliases()

    for col in ["omw", "gw", "ogw"]:
        standings[col] = to_float_eu(standings[col])

    def canon(name: str) -> str:
        if pd.isna(name):
            return name
        return aliases.get(name, name)

    # --- tournaments.json --------------------------------------------------
    player_counts = standings.groupby("tournament_name").size().rename("player_count")
    tournaments_out = tournaments.merge(player_counts, on="tournament_name", how="left")
    tournaments_out = tournaments_out.sort_values("date")
    write_json("tournaments.json", tournaments_out.to_dict(orient="records"))

    # --- standings.json (+ archetype/deck via join por rank) --------------
    st = standings.merge(
        decks,
        on=["tournament_name", "rank"],
        how="left",
        suffixes=("", "_mtgdecks"),
    )
    st = st.merge(
        tournaments[["tournament_name", "date", "format", "mtgdecks_url"]],
        on="tournament_name",
        how="left",
    )
    st["canonical_player_name"] = st["name"].map(canon)
    st_cols = [
        "tournament_name", "date", "format", "rank", "name", "canonical_player_name",
        "points", "wins", "losses", "draws", "omw", "gw", "ogw",
        "archetype", "deck_title", "spiciness", "price_paper_usd",
        "player_name_mtgdecks", "decklist_id", "list_view_url", "visual_view_url",
        "rank_label",
    ]
    st_out = st[st_cols].sort_values(["date", "rank"])
    write_json("standings.json", st_out.to_dict(orient="records"))

    # lookup (tournament_name, name) -> archetype/canonical, para pairings y cards
    lookup = st.set_index(["tournament_name", "name"])[["archetype", "canonical_player_name"]]

    def archetype_of(tournament: str, name: str):
        if name == "BYE":
            return None
        try:
            return lookup.loc[(tournament, name), "archetype"]
        except KeyError:
            return None

    # --- matches.json -------------------------------------------------------
    pr = pairings.merge(
        tournaments[["tournament_name", "date", "format"]], on="tournament_name", how="left"
    )
    pr["player_1_canonical"] = pr["player_1"].map(canon)
    pr["player_2_canonical"] = pr["player_2"].map(canon)
    pr["player_name_winner_canonical"] = pr["player_name_winner"].map(canon)
    pr["archetype_1"] = pr.apply(lambda r: archetype_of(r["tournament_name"], r["player_1"]), axis=1)
    pr["archetype_2"] = pr.apply(lambda r: archetype_of(r["tournament_name"], r["player_2"]), axis=1)
    pr["is_bye"] = (pr["player_1"] == "BYE") | (pr["player_2"] == "BYE")
    pr_cols = [
        "tournament_name", "date", "format", "round", "table",
        "player_1", "player_1_canonical", "archetype_1", "points_player_1",
        "player_2", "player_2_canonical", "archetype_2", "points_player_2",
        "match_results", "player_1_wins", "player_2_wins",
        "player_winner", "player_name_winner", "player_name_winner_canonical",
        "is_draw", "is_bye",
    ]
    pr_out = pr[pr_cols].sort_values(["date", "round", "table"])
    write_json("matches.json", pr_out.to_dict(orient="records"))

    # --- cards.json -----------------------------------------------------
    deck_id_lookup = st.set_index(["tournament_name", "rank"])["canonical_player_name"]
    cd = cards.merge(
        tournaments[["tournament_name", "date", "format"]], on="tournament_name", how="left"
    )
    cd["canonical_player_name"] = cd.apply(
        lambda r: deck_id_lookup.get((r["tournament_name"], r["rank"])), axis=1
    )
    cd_cols = [
        "tournament_name", "date", "format", "rank", "decklist_id",
        "canonical_player_name", "player_name_mtgdecks", "archetype", "deck_title",
        "section", "card_type", "quantity", "card_name", "type_line",
        "rarity", "colors", "image_url",
    ]
    cd_out = cd[cd_cols].sort_values(["date", "rank", "section", "card_name"])
    write_json("cards.json", cd_out.to_dict(orient="records"))

    print("\nListo.")


if __name__ == "__main__":
    main()
