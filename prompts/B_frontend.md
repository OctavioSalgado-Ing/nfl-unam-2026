Eres el agente Frontend. Lee .kiro/steering/rules.md, equipo.md y frontend.md y respétalos al pie de la letra.

Construye en dashboard/ la app completa con esta estructura:
src/api (client.ts, types.ts espejo exacto del contrato de equipo.md, mock.ts), src/components/ui, src/components/charts,
src/features/{partido,situacion,cambiar,estrella,repeticion}, src/lib/format.ts, src/styles/index.css, src/App.tsx.

mock.ts con datos realistas para TB vs CLE: tiempo seguro 2.4, liga 2.7, nivel rojo, QB Tom Brady 2.6 (diferencia +0.2),
lados izquierda 47 / centro 22 / derecha 31, amenaza Myles Garrett gana 18.2% por la izquierda,
bloqueador Donovan Smith LT pierde 5.1%,
claves: "Ayuda extra contra Myles Garrett" (Llega por tu izquierda · gana 18.2% de duelos),
"En 3er down, suelta en menos de 2 s" (Presionan 50% en 3er down · liga 39%),
"Suelta antes de 2.4 s" (A 2.5 s ya llegan en 19% · liga 12%),
contexto presión [42,32], tercer_down [50,39], blitz [22,25];
situación l: presión 60 vs liga 45, blitz 28 vs 31; estrella con [2.4, 45, 208] y sin [2.9, 29, 52];
escenario base 42 → 22 con rollout.

Diseño (una sola vista, minimalista, para un coach bajo presión):
- Arriba: selectores "Mi equipo" vs "Rival" y 5 pestañas: Partido · Situación · Cambiar jugada · Sin su estrella · Repetición.
- Partido: a la izquierda "Suelta el balón antes de" + número gigante en el color del nivel + "Liga X s" + "{QB}: X s · X s tarde/a tiempo";
  a la derecha un mini campo SVG con el QB y 3 líneas de presión (grosor y color según %), apellido de la amenaza con su %,
  y abajo "Lo cuida: {apellido} ({posición}) · X%". Debajo, las 3 claves numeradas (acción grande, dato gris). Pie: 3 pastillas de contexto.
- Situación: 4 botones (1º y 2º, 3º corto, 3º medio, 3º largo) → % de presión gigante con su color, liga y blitz, y una acción.
- Cambiar jugada: botones Play action No/Sí, Mover al QB No/Rollout, Bloqueadores 5/6/7 → presión esperada y yardas,
  con la nota "Estimado con jugadas parecidas de la liga".
- Sin su estrella: botón Con/Sin {apellido} → tiempo seguro y % de presión.
- Repetición: SVG animado (botón "Ver jugada"), reloj en segundos y círculo alrededor del QB verde → ámbar → rojo; la estrella en rojo.

Implementa primero Partido y Situación completas; después Sin su estrella, Cambiar jugada y Repetición.
Un interruptor USE_MOCK en un solo lugar (src/api/client.ts). Todos los estados: carga (skeleton), error con "Reintentar",
"dato de la liga" cuando fuente = liga. @media print para la pestaña Partido.

Al final corre npx tsc --noEmit y el build, y repórtame según la sección 13 de frontend.md.
