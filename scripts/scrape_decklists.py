"""Genera data/lists_mtgdecks.csv a partir de data/tournaments_info_mtgdecks.csv.

Para cada deck (columna list_view_url) scrapea la lista de cartas: mazo
principal y banquillo, con tipo, rareza, colores e imagen de cada carta.

Uso:
    .venv\\Scripts\\python.exe scripts\\scrape_decklists.py [--limit N]
"""
from __future__ import annotations

import argparse
import re

from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup

from mtgdecks_common import browser_session, fetch_html, new_page

ROOT = Path(__file__).resolve().parent.parent
DECKS_INFO = ROOT / "data" / "tournaments_info_mtgdecks.csv"
OUTPUT = ROOT / "data" / "lists_mtgdecks.csv"

COLOR_LETTERS = {"w", "u", "b", "r", "g"}
MANA_CLASS_RE = re.compile(r"^ms-([a-z0-9x]+)$")


def parse_decklist(html: str, deck_meta: dict) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    whole_deck = soup.select_one("#compact .wholeDeck")
    if whole_deck is None:
        print(f"  [aviso] no se encontro '.wholeDeck' para {deck_meta['list_view_url']}")
        return []

    rows = []
    current_section = None  # p.ej. "Creature", "Land", "Sideboard"...
    for el in whole_deck.find_all(["th", "tr"]):
        if el.name == "th":
            classes = el.get("class", [])
            if "type" not in classes:
                continue
            # el texto trae tambien el contador "[39]"; nos quedamos solo con el nombre
            text = el.get_text(" ", strip=True)
            current_section = re.sub(r"\s*\[\d+\]\s*$", "", text).strip()
            continue

        if "cardItem" not in el.get("class", []):
            continue

        card_name = el.get("data-card-id")
        rarity = el.get("data-rarity")
        try:
            quantity = int(el.get("data-required", "0"))
        except ValueError:
            quantity = None

        link = el.select_one("td.number a")
        type_line = link.get("type") if link else None
        image_url = link.get("image") if link else None

        card_type = None
        if type_line:
            card_type = type_line.split("—")[0].strip().title()

        colors = []
        for pip in el.select("td.manaCost span.ms"):
            for cls in pip.get("class", []):
                m = MANA_CLASS_RE.match(cls)
                if m and m.group(1) in COLOR_LETTERS:
                    colors.append(m.group(1).upper())
        # Las tierras no tienen color propio; el resto de cartas sin pips de
        # color (artefactos incoloros, etc.) se marcan como incoloras "C".
        is_land = bool(type_line and "land" in type_line.lower())
        colors_str = "".join(sorted(set(colors))) if colors else ("" if is_land else "C")

        is_sideboard = bool(current_section and current_section.lower().startswith("sideboard"))

        rows.append(
            {
                **deck_meta,
                "section": "sideboard" if is_sideboard else "maindeck",
                "section_header": current_section,
                "card_type": card_type,
                "quantity": quantity,
                "card_name": card_name,
                "type_line": type_line,
                "rarity": rarity,
                "colors": colors_str,
                "image_url": image_url,
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="limitar numero de decks (pruebas)")
    args = parser.parse_args()

    decks = pd.read_csv(DECKS_INFO)
    if args.limit:
        decks = decks.head(args.limit)

    all_rows: list[dict] = []
    with browser_session(headless=True) as browser:
        for i, d in decks.iterrows():
            meta = {
                "tournament_name": d["tournament_name"],
                "rank": d["rank"],
                "decklist_id": d["decklist_id"],
                "player_name_mtgdecks": d["player_name_mtgdecks"],
                "archetype": d["archetype"],
                "deck_title": d["deck_title"],
                "list_view_url": d["list_view_url"],
            }
            print(f"[{i + 1}/{len(decks)}] {meta['tournament_name']} #{meta['rank']} - {meta['deck_title']} ({d['list_view_url']})")
            with new_page(browser) as page:
                html = fetch_html(page, d["list_view_url"])
            rows = parse_decklist(html, meta)
            print(f"  {len(rows)} cartas")
            all_rows.extend(rows)

    if not all_rows:
        print("No se ha extraido ningun dato, no se escribe el CSV.")
        return

    df = pd.DataFrame(all_rows)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT, index=False, encoding="utf-8", lineterminator="\n")
    print(f"\nGuardado {len(df)} filas en {OUTPUT}")


if __name__ == "__main__":
    main()
