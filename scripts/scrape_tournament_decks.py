"""Genera data/tournaments_info_mtgdecks.csv a partir de data/tournaments_info.csv.

Para cada torneo (columna mtgdecks_url), scrapea la tabla de "Decks" de la
pagina del torneo en mtgdecks.net: rank, deck, arquetipo, spiciness, jugador
(tal como aparece en mtgdecks) y los enlaces a list view / visual view.

Uso:
    .venv\\Scripts\\python.exe scripts\\scrape_tournament_decks.py
"""
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup

from mtgdecks_common import BASE_URL, browser_session, fetch_html, new_page

ROOT = Path(__file__).resolve().parent.parent
TOURNAMENTS_INFO = ROOT / "data" / "tournaments_info.csv"
OUTPUT = ROOT / "data" / "tournaments_info_mtgdecks.csv"

RANK_LABEL_RE = re.compile(r"^(\d+(?:st|nd|rd|th)|Top\s?\d+)", re.IGNORECASE)
RECORD_RE = re.compile(r"\((\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?\)")
PCT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%")
DECKLIST_ID_RE = re.compile(r"-(\d+)$")


def parse_tournament_decks(html: str, tournament_name: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    header = soup.find(id="event-decks")
    if header is None:
        print(f"  [aviso] no se encontro la seccion 'event-decks' para {tournament_name}")
        return []
    table = header.find_next("table")
    if table is None:
        print(f"  [aviso] no se encontro la tabla de decks para {tournament_name}")
        return []

    # El "rank" numerico exacto no siempre esta en el texto: para posiciones
    # empatadas mtgdecks agrupa con etiquetas de bracket ("Top4", "Top8",
    # "Top16") en vez de un ordinal. Usamos el orden de aparicion en la
    # tabla (que coincide con el orden de clasificacion) como rank real, y
    # guardamos la etiqueta cruda tal cual aparece como referencia.
    rows = []
    rank = 0
    for tr in table.find_all("tr"):
        deck_link = tr.select_one("a[href*='decklist-by']")
        if deck_link is None:
            continue  # fila de cabecera u otra cosa que no es un deck

        rank_cell = tr.find("td")
        rank_text = rank_cell.get_text(" ", strip=True) if rank_cell else ""
        rank += 1
        label_match = RANK_LABEL_RE.search(rank_text)
        rank_label = label_match.group(1) if label_match else None
        record_match = RECORD_RE.search(rank_text)
        wins_mtgdecks = int(record_match.group(1)) if record_match else None
        losses_mtgdecks = int(record_match.group(2)) if record_match else None
        draws_mtgdecks = (
            int(record_match.group(3)) if record_match and record_match.group(3) else 0
        )
        pct_matches = PCT_RE.findall(rank_text)
        match_win_pct = float(pct_matches[0]) if pct_matches else None
        deck_title = deck_link.get_text(strip=True)
        decklist_path = deck_link["href"]
        decklist_id_match = DECKLIST_ID_RE.search(decklist_path)
        decklist_id = decklist_id_match.group(1) if decklist_id_match else None

        by_span = tr.select_one("span.text-capitalize")
        player_name_mtgdecks = None
        if by_span:
            player_name_mtgdecks = by_span.get_text(strip=True)
            if player_name_mtgdecks.lower().startswith("by "):
                player_name_mtgdecks = player_name_mtgdecks[3:].strip()

        # Si mtgdecks no ha asignado arquetipo a este deck, esa columna
        # muestra el icono de coste de mana en su lugar y el texto sale
        # vacio; lo tratamos como "sin arquetipo" (None).
        archetype_cell = tr.select_one("td.hidden-xs span.small")
        archetype = archetype_cell.get_text(strip=True) if archetype_cell else None
        archetype = archetype or None

        spiciness_span = tr.select_one("td.hidden-xs + td.hidden-xs span")
        spiciness = None
        if spiciness_span:
            sp_match = PCT_RE.search(spiciness_span.get_text(strip=True))
            if sp_match:
                spiciness = float(sp_match.group(1))

        price_span = tr.select_one("span.price .paper.option")
        price_paper = None
        if price_span:
            price_match = re.search(r"[\d.]+", price_span.get_text(strip=True))
            if price_match:
                price_paper = float(price_match.group(0))

        list_view_url = BASE_URL + decklist_path
        visual_view_url = list_view_url + "/visual"

        rows.append(
            {
                "tournament_name": tournament_name,
                "rank": rank,
                "rank_label": rank_label,
                "wins_mtgdecks": wins_mtgdecks,
                "losses_mtgdecks": losses_mtgdecks,
                "draws_mtgdecks": draws_mtgdecks,
                "match_win_pct": match_win_pct,
                "deck_title": deck_title,
                "archetype": archetype,
                "spiciness": spiciness,
                "price_paper_usd": price_paper,
                "player_name_mtgdecks": player_name_mtgdecks,
                "decklist_id": decklist_id,
                "list_view_url": list_view_url,
                "visual_view_url": visual_view_url,
            }
        )
    return rows


def main():
    tournaments = pd.read_csv(TOURNAMENTS_INFO)
    all_rows: list[dict] = []

    with browser_session(headless=True) as browser:
        for _, t in tournaments.iterrows():
            name = t["tournament_name"]
            url = t["mtgdecks_url"]
            print(f"Scrapeando '{name}' -> {url}")
            with new_page(browser) as page:
                html = fetch_html(page, url)
            rows = parse_tournament_decks(html, name)
            print(f"  {len(rows)} decks encontrados")
            all_rows.extend(rows)

    if not all_rows:
        print("No se ha extraido ningun dato, no se escribe el CSV.")
        return

    df = pd.DataFrame(all_rows).sort_values(["tournament_name", "rank"])
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT, index=False, encoding="utf-8", lineterminator="\n")
    print(f"\nGuardado {len(df)} filas en {OUTPUT}")


if __name__ == "__main__":
    main()
