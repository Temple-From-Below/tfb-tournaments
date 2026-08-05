"""Utilidades compartidas para scrapear mtgdecks.net con Playwright.

mtgdecks.net esta detras de Cloudflare y bloquea peticiones HTTP simples
(requests/urllib devuelven 403). Un navegador Chromium real (aunque sea
headless) pasa la proteccion sin problema, asi que usamos Playwright para
todo el scraping.
"""
from __future__ import annotations

import time
from contextlib import contextmanager

from playwright.sync_api import sync_playwright

BASE_URL = "https://mtgdecks.net"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


@contextmanager
def browser_session(headless: bool = True):
    """Contexto que entrega un `browser` de Playwright (una sola instancia,
    reutilizable para varias paginas)."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        try:
            yield browser
        finally:
            browser.close()


@contextmanager
def new_page(browser):
    """Abre un contexto+pagina nuevos sobre un `browser` ya lanzado.

    Reutilizar la misma Page para navegar a muchas URLs seguidas hace que
    Cloudflare empiece a servir el reto anti-bot sin darle tiempo a
    resolverse (deja de encontrarse el contenido renderizado a partir de la
    2a navegacion). Abrir un contexto/pagina nuevos por peticion evita el
    problema, a costa de ser un poco mas lento.
    """
    context = browser.new_context(user_agent=USER_AGENT, locale="es-ES")
    page = context.new_page()
    try:
        yield page
    finally:
        context.close()


@contextmanager
def browser_page(headless: bool = True):
    """Contexto que entrega una Page de Playwright lista para navegar (uso
    puntual, una sola pagina)."""
    with browser_session(headless=headless) as browser, new_page(browser) as page:
        yield page


def fetch_html(page, url: str, retries: int = 3, wait_ms: int = 2500) -> str:
    """Navega a `url` y devuelve el HTML renderizado, con reintentos simples.

    Se usa "domcontentloaded" (no "networkidle"): la pagina tiene peticiones
    de fondo (anuncios, analitica) que nunca terminan de quedar en idle y
    hacen que networkidle salte por timeout.
    """
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(wait_ms)
            return page.content()
        except Exception as e:  # noqa: BLE001 - queremos reintentar cualquier fallo de red
            last_error = e
            print(f"  [aviso] fallo al cargar {url} (intento {attempt}/{retries}): {e}")
            time.sleep(2 * attempt)
    raise RuntimeError(f"No se pudo cargar {url} tras {retries} intentos") from last_error
