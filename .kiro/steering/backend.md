---
inclusion: fileMatch
fileMatchPattern: "backend/{main,contrato}.py"
---
# Agente Backend

- FastAPI 0.115.14 + Pydantic 2.11.7. `contrato.py` define un modelo Pydantic por cada respuesta del contrato de equipo.md
  (campos opcionales como `X | None`). `main.py` usa `response_model` en cada ruta.
- Cargar motor y reportes una sola vez con `lifespan`; responder desde memoria (< 1 s).
- `GET /health` intacto (`{"status": "ok"}`). Toda la API bajo `/api`.
- Validar parámetros: equipo inexistente → 404; ofensiva == rival → 400; valores fuera de rango → 400; siempre con mensaje claro en `detail`.
- Servir el build del dashboard como indica rules.md. Sin dependencias nuevas. Sin llaves en el código.
