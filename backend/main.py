"""API de la Hoja de Protección (NFL Big Data Bowl, UNAM).

Desarrollo:  .venv\\Scripts\\uvicorn backend.main:app --port 8000
Toda la API va bajo /api; GET /health responde {"status": "ok"}. El motor y los reportes se cargan
una sola vez al arrancar (lifespan) y cada ruta responde desde memoria.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from . import contrato, reportes

DIST = Path(__file__).resolve().parent.parent / "dashboard" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    reportes.cargar()
    yield


app = FastAPI(title="Hoja de Protección · NFL Big Data Bowl UNAM", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def parametro_invalido(request, exc: RequestValidationError) -> JSONResponse:
    """Parámetro inválido -> 400 (no 422), como pide el contrato."""
    e = exc.errors()[0] if exc.errors() else {}
    campo = ".".join(str(p) for p in e.get("loc", ())[1:]) or "parámetro"
    return JSONResponse(status_code=400, content={"detail": f"Parámetro inválido: {campo}. {e.get('msg', '')}".strip()})


def _equipo(nombre: str, campo: str) -> str:
    if nombre not in reportes.opciones()["equipos"]:
        raise HTTPException(status_code=404, detail=f"No existe el equipo '{nombre}' en {campo}. Consulta api/opciones.")
    return nombre


def _rivales(ofensiva: str, rival: str) -> None:
    _equipo(ofensiva, "ofensiva")
    _equipo(rival, "rival")
    if ofensiva == rival:
        raise HTTPException(status_code=400, detail="ofensiva y rival deben ser equipos distintos.")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/opciones", response_model=contrato.Opciones)
def api_opciones() -> dict:
    return reportes.opciones()


@app.get("/api/partido", response_model=contrato.Partido)
def api_partido(ofensiva: str, rival: str) -> dict:
    _rivales(ofensiva, rival)
    return reportes.partido(ofensiva, rival)


@app.get("/api/situacion", response_model=contrato.SituacionRespuesta)
def api_situacion(rival: str, sit: contrato.Situacion) -> dict:
    _equipo(rival, "rival")
    return reportes.situacion(rival, sit)


@app.get("/api/escenario", response_model=contrato.Escenario)
def api_escenario(
    rival: str,
    pa: int = Query(0, ge=0, le=1, description="play action: 0 o 1"),
    rollout: int = Query(0, ge=0, le=1, description="mover al QB: 0 o 1"),
    bloqueadores: int = Query(5, ge=5, le=7, description="número de bloqueadores: 5, 6 o 7"),
) -> dict:
    _equipo(rival, "rival")
    return reportes.escenario(rival, pa, rollout, bloqueadores)


@app.get("/api/estrella", response_model=contrato.Estrella)
def api_estrella(rival: str) -> dict:
    _equipo(rival, "rival")
    return reportes.estrella(rival)


@app.get("/api/repeticion", response_model=contrato.Repeticion)
def api_repeticion(rival: str) -> dict:
    _equipo(rival, "rival")
    return reportes.repeticion(rival)


# El build del dashboard se sirve en la misma URL y puerto que la API (va al final: no debe tapar /health ni /api).
if DIST.is_dir():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="dashboard")
