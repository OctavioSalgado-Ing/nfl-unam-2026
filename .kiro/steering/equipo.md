---
inclusion: always
---
# Hoja de Protección · NFL Big Data Bowl UNAM 2026

## Producto
Herramienta para el coordinador ofensivo. Elige "Mi equipo" vs "Rival" y en 5 segundos sabe: cuánto tiempo tiene su QB,
por dónde llega la presión y 3 acciones. Pestañas: Partido · Situación · Cambiar jugada · Sin su estrella · Repetición.
Prioridad: Partido > Situación > Sin su estrella > Cambiar jugada > Repetición.

## Definiciones (no cambiar)
- QB = pff_role "Pass"; rushers = "Pass Rush"; bloqueadores = "Pass Block" (pffScoutingData.csv).
- Inicio = primer frame con event en {ball_snap, autoevent_ballsnap}. Fin = primer frame con event en
  {pass_forward, autoevent_passforward, qb_sack, qb_strip_sack, run, fumble}. Excluir jugadas sin Inicio o Fin.
- Lanzamiento (s) = (Fin − Inicio) / 10.
- Presión = primer frame entre Inicio+5 y Fin con un rusher a <= 2.0 yd del QB. Reloj (s) = (ese frame − Inicio) / 10.
- Lado (vista del QB): dy = y_rusher − y_qb en ese frame; si playDirection == "left", dy = −dy.
  dy > 1 → izquierda; dy < −1 → derecha; si no → centro.
- Tiempo seguro de una defensa = primer t (pasos de 0.1 s) en que el % de sus jugadas con Reloj <= t llega a 15%.
- Nivel: rojo si tiempo seguro < liga − 0.15; verde si > liga + 0.15; si no, amarillo.
- Yardas = prePenaltyPlayResult. Blitz = 5 o más rushers. Zona = pff_passCoverageType "Zone".
- Duelo = fila "Pass Block" con pff_nflIdBlockedPlayer no nulo; perdido si pff_hurryAllowed, pff_hitAllowed o pff_sackAllowed = 1.
  gana_pct del defensor (mínimo 100 duelos) y pierde_pct del bloqueador.
- Amenaza #1 de una defensa = rusher con más presiones (el primero en llegar). Su lado = la moda de sus lados.
- Mi QB = el QB con más jugadas de mi equipo.
- Mi bloqueador del lado: izquierda → LT, derecha → RT, centro → el que más pierde de LG/C/RG
  (titular de cada posición = el de más jugadas en pff_positionLinedUp con pff_role "Pass Block").
- Situaciones: a = 1º y 2º down; c = 3º con 1-3 yd; m = 3º con 4-6 yd; l = 3º o 4º con 7+ yd.
  Si el rival tiene menos de 20 jugadas en esa situación, usar la liga y marcar fuente "liga".
- Validación: presión PFF = algún rusher con pff_hit, pff_hurry o pff_sack = 1. Acuerdo esperado con nuestra presión ~82%.

## Claves (top 3 por partido)
z = (valor − promedio de las 32 defensas) / desviación estándar de las 32 defensas. Candidatas y puntaje:
1. "Suelta antes de {ts} s": −z(ts) + max(0, lanzamiento_QB − ts) / 0.3
2. "Ayuda extra contra {amenaza}": z(gana_pct) + (pierde_pct de mi bloqueador del lado − 6) / 3
3. "Usa play action en 1º y 2º": z(yardas con PA − sin PA vs ese rival); solo si >= 0.5 y n_PA >= 20
4. "En 3er down, suelta en menos de 2 s": z(presión en 3er down); solo si > liga
5. "Si mandan blitz, pase rápido": z(blitz %); solo si >= liga
6. "Rutas que se separen rápido": z(100 − zona %); solo si >= 40
7. "Mueve al QB a la {lado débil}": z(% del lado más fuerte entre izquierda y derecha); solo si >= 40
8. "Hay tiempo: busca el pase largo": (ts − ts_liga) / desviación; solo si ts > liga
Tomar las de puntaje > 0.3, ordenar de mayor a menor y quedarse con 3.
Cada clave lleva "accion" y "dato" (con número y comparación con la liga).

## Situación
- presión >= liga + 8 → accion "Suelta en menos de 2 s", detalle "Pase corto y seguro", nivel rojo.
- presión <= liga − 8 → accion "Hay tiempo", detalle "Busca el pase largo", nivel verde.
- si no → accion "Presión normal", detalle "Juega tu jugada", nivel amarillo.
- Si blitz >= liga + 10, el detalle pasa a "Blitz probable: lectura rápida".

## Cambiar jugada (estimado con jugadas parecidas de toda la liga)
Multiplicador de presión y delta de yardas de cada opción contra su opción base, calculados con la liga:
- play action: pff_playAction 1 vs 0
- rollout: dropBackType DESIGNED_ROLLOUT_* vs TRADITIONAL
- bloqueadores: 6 y 7 vs 5 (número de "Pass Block" en la jugada)
presion_esperada = presión del rival × producto de multiplicadores; yardas_delta = suma de deltas.

## Sin su estrella
Para la amenaza #1: tiempo seguro y % de presión en las jugadas en que él fue rusher vs en las que no (mínimo 20 jugadas en cada grupo; si no, null).

## Repetición
Una jugada real por defensa: presión de la amenaza #1 con Reloj entre 2.2 y 2.8 s (preferir sack).
Coordenadas relativas al QB en el snap, normalizadas para que el ataque vaya hacia +x; solo QB, rushers y bloqueadores; uno de cada 2 frames.

## Contrato de la API (todo bajo /api; porcentajes enteros de 0 a 100; segundos con 1 decimal)
- GET api/opciones -> {"equipos": [str], "validacion_pct": float}
- GET api/partido?ofensiva=&rival= -> {
    "tiempo_seguro_s": float, "tiempo_seguro_liga_s": float, "nivel": "rojo|amarillo|verde",
    "qb": {"nombre": str, "lanzamiento_s": float, "diferencia_s": float},
    "lados": {"izquierda": int, "centro": int, "derecha": int},
    "amenaza": {"nombre": str, "gana_pct": float|null, "lado": "izquierda|centro|derecha"},
    "bloqueador": {"nombre": str, "posicion": str, "pierde_pct": float},
    "claves": [{"accion": str, "dato": str}],
    "contexto": {"presion": [int, int], "tercer_down": [int, int], "blitz": [int, int]} }   (cada par = [rival, liga])
- GET api/situacion?rival=&sit=a|c|m|l -> {"presion_pct", "presion_liga_pct", "blitz_pct", "blitz_liga_pct",
    "fuente": "rival|liga", "accion", "detalle", "nivel"}
- GET api/escenario?rival=&pa=0|1&rollout=0|1&bloqueadores=5|6|7 -> {"presion_actual_pct", "presion_esperada_pct", "yardas_delta"}
- GET api/estrella?rival= -> {"nombre": str, "con": {"tiempo_seguro_s", "presion_pct", "n"} | null, "sin": {...} | null}
- GET api/repeticion?rival= -> {"descripcion": str, "reloj_s": float, "fin_s": float,
    "frames": [[{"rol": "Q|R|B|E", "x": float, "y": float}]]}   (E = la estrella)
Errores: equipo inexistente → 404; ofensiva == rival → 400; parámetro inválido → 400. Ningún endpoint tarda más de 1 s tras el arranque.

## Dueños
- Data: backend/motor.py, backend/reportes.py
- Backend: backend/main.py, backend/contrato.py
- Frontend: dashboard/** y README.md
Nadie edita archivos de otro agente. Cambiar el contrato = actualizar primero este archivo.

## Lo que NO se calcula
Nada después del lanzamiento (destino del balón, receptores, yardas aéreas). Textos con "se asocia con", nunca "causa".
