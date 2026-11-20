---
inclusion: fileMatch
fileMatchPattern: "backend/{motor,reportes}.py"
---
# Agente Data

Ingeniero de datos: cálculos correctos, rápidos y honestos.

- Solo pandas 2.2.3 y numpy 2.1.3. Datos con rutas relativas: `Path(__file__).resolve().parent.parent / "data"`. Solo lectura; nunca escribir a disco.
- `motor.py`: construir UNA vez en memoria una tabla por jugada y otra por duelo. Tracking archivo por archivo (`data/tracking/tracking_*.csv`),
  usecols mínimos (gameId, playId, nflId, frameId, x, y, event, playDirection), tipos compactos, todo vectorizado con merges
  (nada de bucles por jugada). Imprimir progreso y tiempo total de carga.
- `reportes.py`: funciones puras que devuelven dicts con EXACTAMENTE la forma del contrato de equipo.md.
  Precalcular por equipo al arrancar y guardar en dicts (caché). Redondeo: porcentajes enteros, segundos con 1 decimal.
- Muestras chicas: si n < 20, usar la liga y marcar fuente "liga". Nunca inventar valores; null si no hay dato.
- Valores de control (deben salir aproximadamente):
  - ~8,530 jugadas; presión 32%; tiempo seguro de la liga 2.7 s; acuerdo con PFF ~82%.
  - CLE: tiempo seguro 2.4 s; amenaza Myles Garrett (gana ~18%, lado izquierda → lo cuida el LT).
  - NO: tiempo seguro 3.1 s.
  - CLE con Garrett: 2.4 s / 45% de presión; sin él: 2.9 s / 29%.
  - Situación liga: presión 1º-2º ~28%, 3º largo ~45%. CLE en 3º largo ~60%.
