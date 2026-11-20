"""Comprueba que las tres capas del contrato dicen lo mismo.

Compara campo por campo los modelos de ``backend/contrato.py`` con las interfaces de
``dashboard/src/api/types.ts``: nombres, nulabilidad y tipo. Si alguien cambia el contrato
en un lado y no en el otro, esto lo dice antes de que falle en pantalla.

Uso:  .venv\\Scripts\\python -m backend.verificar_contrato
"""
from __future__ import annotations

import re
import sys
import types as tipos_py
import typing
from pathlib import Path

from . import contrato

TYPES_TS = Path(__file__).resolve().parent.parent / "dashboard" / "src" / "api" / "types.ts"

# Nombre de la interfaz en types.ts -> modelo de contrato.py
PAREJAS: list[tuple[str, type]] = [
    ("Opciones", contrato.Opciones),
    ("QB", contrato.QB),
    ("Lados", contrato.Lados),
    ("Amenaza", contrato.Amenaza),
    ("Bloqueador", contrato.Bloqueador),
    ("Clave", contrato.Clave),
    ("Contexto", contrato.Contexto),
    ("Partido", contrato.Partido),
    ("Situacion", contrato.SituacionRespuesta),
    ("Escenario", contrato.Escenario),
    ("GrupoEstrella", contrato.GrupoEstrella),
    ("Estrella", contrato.Estrella),
    ("Punto", contrato.Punto),
    ("Repeticion", contrato.Repeticion),
]


def leer_typescript(texto: str) -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    interfaces: dict[str, dict[str, str]] = {}
    for bloque in re.finditer(r"export interface (\w+) \{(.*?)\n\}", texto, re.S):
        campos: dict[str, str] = {}
        for linea in bloque.group(2).splitlines():
            linea = linea.strip()
            if not linea or linea[0] in "/*":
                continue
            campo = re.match(r"(\w+)\??:\s*(.+?)$", linea)
            if campo:
                campos[campo.group(1)] = campo.group(2).strip()
        interfaces[bloque.group(1)] = campos
    alias = dict(re.findall(r"export type (\w+) = ([^\n]+)", texto))
    return interfaces, alias


def clase_ts(tipo: str, alias: dict[str, str]) -> str:
    tipo = tipo.replace("| null", "").strip()
    tipo = alias.get(tipo, tipo).strip()
    if tipo.endswith("[]") or tipo.startswith("["):
        return "lista"
    if tipo in ("string", "number", "boolean"):
        return tipo
    return "string" if "'" in tipo else "objeto"


def clase_py(anotacion: object) -> str:
    base = anotacion
    if typing.get_origin(base) in (typing.Union, tipos_py.UnionType):
        reales = [t for t in typing.get_args(base) if t is not type(None)]
        if len(reales) == 1:
            base = reales[0]
    if typing.get_origin(base) is typing.Literal:
        return "string"
    if (typing.get_origin(base) or base) in (list, tuple):
        return "lista"
    if base is str:
        return "string"
    if base in (int, float):
        return "number"
    if base is bool:
        return "boolean"
    return "objeto"


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    interfaces, alias = leer_typescript(TYPES_TS.read_text(encoding="utf-8"))
    problemas: list[str] = []
    total = 0

    for nombre, modelo in PAREJAS:
        python = {
            campo: (info.annotation, type(None) in typing.get_args(info.annotation))
            for campo, info in modelo.model_fields.items()
        }
        ts = interfaces.get(nombre)
        total += len(python)
        if ts is None:
            problemas.append(f"{nombre}: no existe la interfaz en types.ts")
            print(f"  {nombre:16s} {len(python)} campos  FALTA en types.ts")
            continue

        detalles = [f"falta {c}" for c in python if c not in ts]
        detalles += [f"sobra {c}" for c in ts if c not in python]
        for campo, (anotacion, admite_none) in python.items():
            if campo not in ts:
                continue
            declarado = ts[campo]
            if admite_none != ("| null" in declarado):
                esperado = "T | null" if admite_none else "sin null"
                detalles.append(f"{campo}: debería ser {esperado}, es {declarado}")
            elif clase_py(anotacion) != clase_ts(declarado, alias):
                detalles.append(f"{campo}: {clase_py(anotacion)} en Python y {clase_ts(declarado, alias)} en TS")
        print(f"  {nombre:16s} {len(python)} campos  {'OK' if not detalles else 'DIFERENCIAS: ' + ', '.join(detalles)}")
        problemas += [f"{nombre}.{d}" for d in detalles]

    print(f"\n{total} campos comparados en {len(PAREJAS)} modelos.")
    if problemas:
        print("DIFERENCIAS (corrige el frontend, no el contrato):")
        for p in problemas:
            print(f"  - {p}")
        return 1
    print("types.ts coincide campo por campo con contrato.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
