"""Descarga las imagenes de cartas referenciadas en cards.json a
web/public/img/cards/ y reescribe image_url a una ruta local relativa.

mtgdecks.net envia Cross-Origin-Resource-Policy en esas imagenes, asi que
el navegador las bloquea si se enlazan directamente (hotlink) desde otro
origen (nuestra web). Servirlas nosotros mismos lo evita y de paso hace la
web independiente de que mtgdecks seas accesible en el momento de la
visita.

Uso:
    .venv\\Scripts\\python.exe scripts\\download_card_images.py
"""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

import requests

ROOT = Path(__file__).resolve().parent.parent
CARDS_JSON = ROOT / "web" / "public" / "data" / "cards.json"
IMG_DIR = ROOT / "web" / "public" / "img" / "cards"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


def local_rel_path(url: str) -> str:
    """https://mtgdecks.net/img/card/M14/elvish-mystic-169.jpg
    -> img/cards/M14-elvish-mystic-169.jpg

    Sin subcarpetas por set: algunos codigos de set de Magic (p.ej. "CON",
    Conflux) coinciden con nombres de dispositivo reservados en Windows
    (CON/PRN/AUX/NUL/COM1-9/LPT1-9) y no se pueden crear/leer como
    directorio normal (Git y el navegador fallan al acceder). Aplanamos
    todo a un unico nivel para evitarlo, con el set como prefijo del
    nombre de fichero (que si es un nombre de fichero valido).
    """
    path = urlparse(url).path  # /img/card/M14/elvish-mystic-169.jpg
    tail = path.split("/img/card/", 1)[-1]
    flat = tail.replace("/", "-")
    return f"img/cards/{flat}"


def main():
    cards = json.loads(CARDS_JSON.read_text(encoding="utf-8"))
    urls = sorted({c["image_url"] for c in cards if c.get("image_url")})
    print(f"{len(urls)} imagenes unicas a comprobar/descargar")

    url_to_rel: dict[str, str] = {}
    downloaded = skipped = failed = 0
    for i, url in enumerate(urls, 1):
        rel = local_rel_path(url)
        url_to_rel[url] = rel
        dest = ROOT / "web" / "public" / rel
        if dest.exists() and dest.stat().st_size > 0:
            skipped += 1
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
            downloaded += 1
        except Exception as e:  # noqa: BLE001
            print(f"  [aviso] fallo descargando {url}: {e}")
            failed += 1
        if i % 50 == 0:
            print(f"  ...{i}/{len(urls)}")

    for c in cards:
        if c.get("image_url") in url_to_rel:
            c["image_url"] = url_to_rel[c["image_url"]]

    CARDS_JSON.write_text(
        json.dumps(cards, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"\nDescargadas: {downloaded}, ya existentes: {skipped}, fallidas: {failed}")
    print(f"cards.json actualizado con rutas locales -> {CARDS_JSON}")


if __name__ == "__main__":
    main()
