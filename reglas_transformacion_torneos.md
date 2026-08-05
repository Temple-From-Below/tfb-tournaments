# Reglas de transformación: datos de torneos AetherHub → CSV para Google Sheets

Este documento describe cómo transformar las tablas de standings y pairings copiadas de AetherHub.com en archivos CSV listos para importar a Google Sheets. Úsalo como referencia cada vez que se pida repetir este proceso.

## Formato general del CSV (obligatorio)

- **Separador de columnas:** punto y coma `;` (no coma), porque la configuración regional del Google Sheets de destino es española.
- **Separador decimal:** coma `,` (no punto), por el mismo motivo. Ejemplo: `60,4167` en vez de `60.4167`.
- **Nunca incluir el símbolo `%`** como parte del texto de un número — Google Sheets lo reinterpreta mal (multiplica el valor). Los porcentajes se guardan como número decimal plano (ej. `60,4167` representa 60.4167%), sin formatear como porcentaje en el CSV.
- Todas las filas de todas las tablas van en el **mismo archivo/pestaña**, no una pestaña por tabla.
- Codificación UTF-8, sin retornos de carro `\r` (solo `\n`).

## Tabla 1: Standings (clasificación)

**Origen:** tablas con columnas `Rank, Name, Points, Results, OMW, GW, OGW`, precedidas por el nombre del torneo (ej. "Mensual Abril 2025").

**Columnas de salida:**
```
tournament_name;rank;name;points;wins;losses;draws;omw;gw;ogw
```

**Reglas:**
- `tournament_name`: el texto que aparece justo antes de la tabla (ej. "Mensual Abril 2025"). Se repite en todas las filas de esa tabla.
- `Results` (ej. "3 - 0 - 1" o "3 - 1") se descompone en tres columnas:
  - `wins` = primer número
  - `losses` = segundo número
  - `draws` = tercer número si existe, si no **0**
- `omw`, `gw`, `ogw`: quitar el símbolo `%`, convertir el punto decimal en coma.

## Tabla 2: Pairings (emparejamientos)

**Origen:** tablas con columnas `Table, Player 1, Player 2, Match Results`, precedidas por DOS líneas de contexto:
1. Nombre del torneo (ej. "Mensual Abril 2025")
2. Número de ronda como texto (ej. "Ronda 1")

**Columnas de salida:**
```
tournament_name;round;table;player_1;points_player_1;player_2;points_player_2;match_results;player_1_wins;player_2_wins;player_winner;player_name_winner;is_draw
```

**Reglas:**
- `tournament_name`: primer texto antes de la tabla, repetido en todas las filas.
- `round`: segundo texto antes de la tabla, extraer SOLO el número (ej. "Ronda 1" → `1`).
- `table`: columna Table tal cual (número).
- Cada celda de jugador viene como `Nombre (N Points)`. Se separa en dos columnas:
  - `player_1` / `player_2`: solo el nombre (ej. "Teba")
  - `points_player_1` / `points_player_2`: solo el número (ej. `0`)
  - Nota: "BYE" se trata como un jugador más (player_1 o player_2 = "BYE", puntos = 0).
- `match_results`: se mantiene tal cual como texto (ej. "2 - 1"), no se traduce a puntos de torneo.
- Columnas derivadas del resultado del match (parseando `match_results`, formato "X - Y"):
  - `player_1_wins` = X, `player_2_wins` = Y (como números)
  - `player_winner`: `1` si X > Y, `2` si Y > X, vacío si X = Y (empate)
  - `player_name_winner`: nombre del jugador ganador (según player_winner), vacío si empate
  - `is_draw`: `True` si X = Y, si no `False`

**Importante:** si aparece una tabla con columnas `Rank, Name, Points, Results, OMW, GW, OGW` bajo un encabezado de "Ronda X", es en realidad una tabla de standings mal pegada, no de pairings — avisar al usuario y no forzarla en este formato.

## Proceso al recibir nuevas tablas

1. Identificar si es tabla de standings o de pairings por sus columnas.
2. Aplicar las reglas correspondientes de arriba.
3. Generar el CSV con `;` como separador y `,` como decimal.
4. Si se añaden filas a un CSV ya existente, mantener el mismo esquema de columnas y separador.
5. Entregar el archivo y recordar seleccionar `;` como separador al importar en Sheets.
