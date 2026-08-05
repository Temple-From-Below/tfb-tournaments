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

Con `tournaments_info.csv` actualizado (nuevo torneo + `mtgdecks_url`) y,
tras el primer torneo nuevo con jugadores repetidos, revisando
`data/player_aliases.csv` (ver mas abajo):

```powershell
# 1. Standings/arquetipos de cada torneo -> data/tournaments_info_mtgdecks.csv
.\.venv\Scripts\python.exe scripts\scrape_tournament_decks.py

# 2. Listas de cartas de cada mazo -> data/lists_mtgdecks.csv
.\.venv\Scripts\python.exe scripts\scrape_decklists.py
# --limit N para probar solo con los primeros N mazos

# 3. Revisar/completar data/player_aliases.csv con los jugadores nuevos
#    (una fila por nombre nuevo en tournament_standings.csv; ver seccion
#    "Alias de jugadores" mas abajo)

# 4. Unir todo y generar los JSON que consume la web -> web/public/data/*.json
.\.venv\Scripts\python.exe scripts\build_dataset.py

# 5. Descargar las imagenes de cartas referenciadas (solo las nuevas) ->
#    web/public/img/cards/ + reescribe cards.json a rutas locales
.\.venv\Scripts\python.exe scripts\download_card_images.py
```

Todos los scripts son deterministas y regeneran su salida completa desde
cero cada vez, asi que basta con volver a ejecutarlos en orden tras anadir
un torneo nuevo (el paso 5 solo descarga las imagenes que no existan ya en
disco).

## Alias de jugadores (`data/player_aliases.csv`)

Un mismo jugador no siempre aparece con el mismo nombre en cada torneo
(apodo, nombre completo, iniciales...). `build_dataset.py` agrega las
estadisticas por jugador usando la columna `canonical_player_name` de este
fichero, no el nombre crudo. Tiene una fila por cada nombre visto en
`tournament_standings.csv`; al anadir un torneo con jugadores nuevos:

1. Ejecuta `scrape_tournament_decks.py` y luego compara los nombres nuevos
   de `tournament_standings.csv` contra los ya existentes en
   `player_aliases.csv`.
2. Anade una fila por nombre nuevo. Si es alguien que ya jugaba con otro
   nombre/apodo, pon el mismo `canonical_player_name` que su fila anterior
   (la columna `note` explica el criterio en los casos ya detectados).
3. Los casos marcados `confidence=revisar` son alias sospechados pero sin
   confirmar - contrastarlos y corregir el `canonical_player_name` si hace
   falta.

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
