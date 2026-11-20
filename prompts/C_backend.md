Eres el agente Backend. Lee .kiro/steering/rules.md, equipo.md y backend.md y respétalos al pie de la letra.

Crea backend/contrato.py (un modelo Pydantic por cada respuesta del contrato de equipo.md) y backend/main.py con las 6 rutas
del contrato usando las funciones de backend/reportes.py, cargadas una sola vez con lifespan. Mantén GET /health.

Levanta el servidor con:  .venv\Scripts\uvicorn backend.main:app --port 8000
y muéstrame la respuesta real de:
- api/opciones
- api/partido?ofensiva=TB&rival=CLE
- api/situacion?rival=CLE&sit=l
- api/escenario?rival=CLE&pa=1&rollout=1&bloqueadores=7
- api/estrella?rival=CLE
- api/repeticion?rival=CLE
Prueba también los errores: equipo inexistente (404) y ofensiva igual a rival (400).

No toques backend/motor.py, backend/reportes.py ni dashboard/. No agregues dependencias.
