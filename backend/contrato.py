"""Modelos Pydantic de las respuestas de la API.

Un modelo por cada respuesta del contrato de .kiro/steering/equipo.md. Porcentajes enteros de 0 a 100
y segundos con 1 decimal. Los campos opcionales del contrato son ``X | None``.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Nivel = Literal["rojo", "amarillo", "verde"]
Lado = Literal["izquierda", "centro", "derecha"]
Fuente = Literal["rival", "liga"]
Rol = Literal["Q", "R", "B", "E"]
Situacion = Literal["a", "c", "m", "l"]


class Opciones(BaseModel):
    """GET api/opciones"""
    equipos: list[str]
    validacion_pct: float


class QB(BaseModel):
    nombre: str
    lanzamiento_s: float
    diferencia_s: float


class Lados(BaseModel):
    izquierda: int
    centro: int
    derecha: int


class Amenaza(BaseModel):
    nombre: str
    gana_pct: float | None
    lado: Lado


class Bloqueador(BaseModel):
    nombre: str
    posicion: str
    pierde_pct: float


class Clave(BaseModel):
    accion: str
    dato: str


class Contexto(BaseModel):
    """Cada par es [rival, liga]."""
    presion: list[int] = Field(min_length=2, max_length=2)
    tercer_down: list[int] = Field(min_length=2, max_length=2)
    blitz: list[int] = Field(min_length=2, max_length=2)


class Partido(BaseModel):
    """GET api/partido?ofensiva=&rival="""
    tiempo_seguro_s: float
    tiempo_seguro_liga_s: float
    nivel: Nivel
    qb: QB
    lados: Lados
    amenaza: Amenaza
    bloqueador: Bloqueador
    claves: list[Clave]
    contexto: Contexto


class SituacionRespuesta(BaseModel):
    """GET api/situacion?rival=&sit=a|c|m|l"""
    presion_pct: int
    presion_liga_pct: int
    blitz_pct: int
    blitz_liga_pct: int
    fuente: Fuente
    accion: str
    detalle: str
    nivel: Nivel


class Escenario(BaseModel):
    """GET api/escenario?rival=&pa=0|1&rollout=0|1&bloqueadores=5|6|7"""
    presion_actual_pct: int
    presion_esperada_pct: int
    yardas_delta: float


class GrupoEstrella(BaseModel):
    tiempo_seguro_s: float
    presion_pct: int
    n: int


class Estrella(BaseModel):
    """GET api/estrella?rival="""
    nombre: str
    con: GrupoEstrella | None
    sin: GrupoEstrella | None


class Punto(BaseModel):
    rol: Rol
    x: float
    y: float


class Repeticion(BaseModel):
    """GET api/repeticion?rival="""
    descripcion: str
    reloj_s: float
    fin_s: float
    frames: list[list[Punto]]
