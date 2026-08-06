# TFB Tournaments — Dashboard Pauper de Temple From Below

Dashboard con las clasificaciones, el metagame y las listas de los torneos
mensuales de Pauper que organiza Temple From Below (AetherHub para jugar,
mtgdecks.net para las listas).

**Web en producción:** https://temple-from-below.github.io/tfb-tournaments/

## Stack

| Capa | Elección |
|---|---|
| Datos fuente | CSV versionados en `data/` (el mismo flujo que ya usabais) |
| Scraping mtgdecks.net | Python + Playwright (Chromium real headless — mtgdecks.net esta detras de Cloudflare y bloquea peticiones HTTP simples) |
| Pipeline de agregación | Python + pandas → JSON en `web/public/data/` |
| Web | React + Vite (estático, sin backend — el dataset es pequeño y se filtra/agrega en el cliente) |
| Hosting | GitHub Pages, desplegado por GitHub Actions en cada push a `main` |

## Estructura

```
data/                          CSV fuente (standings, pairings, info, mtgdecks, alias de jugadores)
scripts/                       scrapers + pipeline de agregación (Python) — ver scripts/README.md
web/                           app React + Vite
  public/data/*.json           datos ya unidos y limpios que consume la web
  public/img/cards/            imágenes de cartas descargadas (mtgdecks bloquea el hotlink)
  src/lib/aggregate.ts         cálculos de metagame, matriz de enfrentamientos, jugadores, cartas
.github/workflows/deploy.yml   build + deploy a GitHub Pages
```

## Añadir un torneo nuevo

1. Copiar standings/pairings de AetherHub a `data/tournament_standings.csv` y
   `data/tournament_pairings.csv` siguiendo `reglas_transformacion_torneos.md`
   (el flujo de siempre, vía Claude chat web).
2. Añadir una fila en `data/tournaments_info.csv` (nombre, fecha, formato, `mtgdecks_url`).
3. Seguir `scripts/README.md` para: scrapear mtgdecks (arquetipos + listas),
   revisar `data/player_aliases.csv` si hay jugadores nuevos, regenerar los
   JSON y descargar las imágenes de cartas nuevas.
4. `git add -A && git commit && git push` — GitHub Actions reconstruye y
   despliega la web sola.

## Desarrollo local de la web

```powershell
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción en web/dist
```

## Notas / limitaciones conocidas

- El cruce entre `tournament_standings.csv` (AetherHub) y
  `tournaments_info_mtgdecks.csv` (mtgdecks) se hace por posición final
  (`rank`) de cada torneo, no por nombre — mtgdecks no siempre usa el mismo
  nombre que AetherHub. Es un heurístico razonable pero no infalible; ver
  `scripts/README.md` para el detalle.
- Un mismo jugador puede aparecer con distinto nombre en cada torneo; las
  estadísticas por jugador usan `data/player_aliases.csv` para agruparlos.
  Revisar ese fichero al añadir jugadores nuevos.
- No todos los mazos de mtgdecks tienen arquetipo asignado por la propia
  web; esos mazos no cuentan en el % de metagame ni en la matriz de
  enfrentamientos (sí en la clasificación y en cartas).
