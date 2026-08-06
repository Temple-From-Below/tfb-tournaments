"""Reescribe image_url en cards.json a URLs de Scryfall CDN.

Las imagenes de mtgdecks.net no se pueden hotlinkear desde otro origen
(mandan Cross-Origin-Resource-Policy: same-origin). Antes se descargaban
localmente para servir en la propia web, pero eso anade ~70 MB al
artefacto de GitHub Pages y provoca timeouts en el deploy.

Scryfall permite hotlink de sus imagenes y ofrece un endpoint publico por
set + numero de coleccion que funciona directamente en el navegador.

Uso:
    .venv\\Scripts\\python.exe scripts\\download_card_images.py
"""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
CARDS_JSON = ROOT / "web" / "public" / "data" / "cards.json"

SCRYFALL_BASE = "https://api.scryfall.com/cards"


def _collector_from_stem(set_code: str, stem_parts: list[str]) -> str:
    """Extrae el numero de coleccion de las partes del slug de la carta.

    Para cartas normales el ultimo segmento es el numero (p.ej. "95").
    Para cartas PLST el numero de Scryfall es "{set_orig}-{cn}" (p.ej.
    "a25-43"), que corresponde a los dos ultimos segmentos del slug.
    Para cartas WC el ultimo segmento es alfanumerico (p.ej. "we89sb").
    """
    if set_code == "plst":
        return f"{stem_parts[-2]}-{stem_parts[-1]}"
    return stem_parts[-1]


def mtgdecks_to_scryfall_url(url: str) -> str:
    """https://mtgdecks.net/img/card/VOW/blood-fountain-95.jpg
    -> https://api.scryfall.com/cards/vow/95?format=image&version=small
    """
    path = urlparse(url).path  # /img/card/VOW/blood-fountain-95.jpg
    tail = path.split("/img/card/", 1)[-1]  # VOW/blood-fountain-95.jpg
    set_part, filename = tail.split("/", 1)
    set_code = set_part.lower()
    stem = filename.rsplit(".", 1)[0]  # blood-fountain-95
    parts = stem.split("-")
    collector = _collector_from_stem(set_code, parts)
    return f"{SCRYFALL_BASE}/{set_code}/{collector}?format=image&version=small"


def local_to_scryfall_url(local_path: str) -> str:
    """img/cards/VOW-blood-fountain-95.jpg
    -> https://api.scryfall.com/cards/vow/95?format=image&version=small

    Supone que el primer segmento separado por '-' es siempre el set code
    (todos los set codes de Magic son alfanumericos sin guiones) y que el
    colector es el ultimo segmento (o los dos ultimos para PLST).
    """
    stem = local_path.removeprefix("img/cards/").removesuffix(".jpg")
    parts = stem.split("-")
    set_code = parts[0].lower()
    # parts[1:] son {palabras-del-nombre-de-carta...} + {numero-de-coleccion}
    collector = _collector_from_stem(set_code, parts[1:])
    return f"{SCRYFALL_BASE}/{set_code}/{collector}?format=image&version=small"


def _to_scryfall(url: str) -> str:
    """Convierte cualquier formato de image_url a URL de Scryfall CDN."""
    if url.startswith("http"):
        host = urlparse(url).hostname or ""
        if host == "mtgdecks.net" or host.endswith(".mtgdecks.net"):
            return mtgdecks_to_scryfall_url(url)
        if host == "scryfall.com" or host.endswith(".scryfall.com") \
                or host == "cards.scryfall.io" or host.endswith(".scryfall.io"):
            # Ya es URL de Scryfall; devolver tal cual.
            return url
        # Dominio externo desconocido: hotlink podria estar bloqueado.
        print(f"  [aviso] image_url de dominio desconocido (no se convertira): {url}")
        return url
    # Ruta local relativa (img/cards/...)
    return local_to_scryfall_url(url)


def sync_images(cards: list[dict], quiet: bool = False) -> list[dict]:
    """Reescribe `image_url` en cada dict a la URL de Scryfall CDN, in-place.

    Reutilizable: la llama tanto este script en CLI como build_dataset.py
    al final de cada build, para que un build normal SIEMPRE deje cards.json
    con URLs de Scryfall.
    """
    urls = sorted({c["image_url"] for c in cards if c.get("image_url")})
    if not quiet:
        print(f"{len(urls)} image_url unicas a convertir a Scryfall CDN")

    url_map: dict[str, str] = {url: _to_scryfall(url) for url in urls}

    for c in cards:
        if c.get("image_url") in url_map:
            c["image_url"] = url_map[c["image_url"]]

    print(f"image_url reescritas a Scryfall CDN: {len(url_map)}")
    return cards


def main():
    cards = json.loads(CARDS_JSON.read_text(encoding="utf-8"))
    sync_images(cards)
    CARDS_JSON.write_text(
        json.dumps(cards, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"cards.json actualizado con URLs de Scryfall CDN -> {CARDS_JSON}")


if __name__ == "__main__":
    main()
