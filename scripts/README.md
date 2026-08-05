# Scripts de scraping mtgdecks.net

mtgdecks.net esta protegido por Cloudflare y bloquea peticiones HTTP simples
(`requests`, `urllib`, etc. devuelven 403). Por eso estos scripts usan
[Playwright](https://playwright.dev/python/) con un Chromium real (headless)
para navegar y renderizar las paginas antes de parsear el HTML con
BeautifulSoup.

## Instalacion (una vez)

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r scripts\requirements.txt
.\.venv\Scripts\python.exe -m playwright install chromium
```

## Uso

Con `tournaments_info.csv` actualizado (nuevo torneo + `mtgdecks_url`):

```powershell
# 1. Standings/arquetipos de cada torneo -> data/tournaments_info_mtgdecks.csv
.\.venv\Scripts\python.exe scripts\scrape_tournament_decks.py

# 2. Listas de cartas de cada mazo -> data/lists_mtgdecks.csv
.\.venv\Scripts\python.exe scripts\scrape_decklists.py
# --limit N para probar solo con los primeros N mazos
```

Ambos scripts son deterministas y regeneran el CSV completo desde cero cada
vez (leen todos los torneos de `tournaments_info.csv` / todos los mazos de
`tournaments_info_mtgdecks.csv`), asi que basta con volver a ejecutarlos
tras anadir un torneo nuevo.

## Notas de diseno / caveats

- **Un contexto/pagina de Playwright nuevo por peticion** (`new_page()` en
  `mtgdecks_common.py`): reutilizar la misma pestana para navegar a varias
  URLs seguidas hace que Cloudflare empiece a mostrar el reto anti-bot sin
  darle tiempo a resolverse. Abrir contexto nuevo por peticion lo evita.
- **`rank`** en `tournaments_info_mtgdecks.csv` es el **orden de aparicion**
  en la tabla de decks del torneo, no un ordinal parseado del texto: para
  posiciones empatadas mtgdecks muestra etiquetas de bracket ("Top4",
  "Top8"...) en vez de "3rd/4th/...". Se guarda esa etiqueta cruda en
  `rank_label` como referencia. El join con `tournament_standings.csv`
  por `tournament_name` + `rank` es un **heuristico razonable, no
  garantizado al 100%** (igual que avisa el enunciado del proyecto);
  `player_name_mtgdecks` sirve de apoyo para un matching por nombre si hace
  falta desambiguar.
- **`archetype`** puede salir vacio: no todos los mazos subidos a mtgdecks
  tienen un arquetipo asignado por la web.
- **`deck_title`** puede aparecer truncado con "..." para nombres largos
  (asi lo sirve mtgdecks en la tabla del torneo).
