"""Prueba manual de la API: muestra la respuesta real de cada ruta del contrato y de los errores.

Uso (con el servidor levantado en el puerto 8000):
    .venv\\Scripts\\python -m backend.probar_api
No forma parte de la aplicación: solo imprime lo que responde el servidor.
"""
from __future__ import annotations

import json
import sys
import time

import httpx

BASE = "http://localhost:8000"

RUTAS = [
    ("api/opciones", {}),
    ("api/partido", {"ofensiva": "TB", "rival": "CLE"}),
    ("api/situacion", {"rival": "CLE", "sit": "l"}),
    ("api/escenario", {"rival": "CLE", "pa": 1, "rollout": 1, "bloqueadores": 7}),
    ("api/estrella", {"rival": "CLE"}),
    ("api/repeticion", {"rival": "CLE"}),
]

ERRORES = [
    ("api/partido", {"ofensiva": "TB", "rival": "XXX"}, 404, "equipo inexistente"),
    ("api/estrella", {"rival": "Cleveland"}, 404, "equipo inexistente"),
    ("api/partido", {"ofensiva": "CLE", "rival": "CLE"}, 400, "ofensiva igual a rival"),
    ("api/situacion", {"rival": "CLE", "sit": "z"}, 400, "sit fuera del contrato"),
    ("api/escenario", {"rival": "CLE", "pa": 2, "rollout": 0, "bloqueadores": 5}, 400, "pa fuera de rango"),
    ("api/escenario", {"rival": "CLE", "pa": 0, "rollout": 0, "bloqueadores": 9}, 400, "bloqueadores fuera de rango"),
    ("api/partido", {"ofensiva": "TB"}, 400, "falta el parámetro rival"),
]


def pedir(cliente: httpx.Client, ruta: str, params: dict) -> tuple[int, int, object]:
    t = time.perf_counter()
    r = cliente.get(f"{BASE}/{ruta}", params=params)
    ms = int((time.perf_counter() - t) * 1000)
    try:
        return r.status_code, ms, r.json()
    except ValueError:
        return r.status_code, ms, r.text


def resumen(ruta: str, cuerpo) -> str:
    if ruta == "api/repeticion" and isinstance(cuerpo, dict) and "frames" in cuerpo:
        f = cuerpo["frames"]
        copia = dict(cuerpo)
        copia["frames"] = (
            f"[{len(f)} frames x {len(f[0])} jugadores] primero: "
            + " ".join(f"{p['rol']}({p['x']},{p['y']})" for p in f[0])
        )
        return json.dumps(copia, ensure_ascii=False, indent=2)
    return json.dumps(cuerpo, ensure_ascii=False, indent=2)


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    with httpx.Client(timeout=30) as cliente:
        codigo, ms, cuerpo = pedir(cliente, "health", {})
        print(f"GET /health -> {codigo} en {ms} ms: {json.dumps(cuerpo, ensure_ascii=False)}\n")

        print("=" * 78)
        print("LAS 6 RUTAS DEL CONTRATO")
        print("=" * 78)
        for ruta, params in RUTAS:
            codigo, ms, cuerpo = pedir(cliente, ruta, params)
            q = "&".join(f"{k}={v}" for k, v in params.items())
            print(f"\n----- GET {ruta}{'?' + q if q else ''}  ->  HTTP {codigo} en {ms} ms")
            print(resumen(ruta, cuerpo))

        print("\n" + "=" * 78)
        print("ERRORES")
        print("=" * 78)
        fallos = 0
        for ruta, params, esperado, que in ERRORES:
            codigo, ms, cuerpo = pedir(cliente, ruta, params)
            ok = "OK" if codigo == esperado else f"ESPERABA {esperado}"
            fallos += codigo != esperado
            q = "&".join(f"{k}={v}" for k, v in params.items())
            print(f"\n----- GET {ruta}?{q}  ({que})")
            print(f"      HTTP {codigo} [{ok}] en {ms} ms: {json.dumps(cuerpo, ensure_ascii=False)}")

        print("\n" + "=" * 78)
        print("TODOS LOS EQUIPOS Y TIEMPOS")
        print("=" * 78)
        equipos = cliente.get(f"{BASE}/api/opciones").json()["equipos"]
        llamadas = [
            (ruta, params)
            for eq in equipos
            for ruta, params in (
                ("api/partido", {"ofensiva": "TB" if eq != "TB" else "KC", "rival": eq}),
                ("api/situacion", {"rival": eq, "sit": "l"}),
                ("api/escenario", {"rival": eq, "pa": 1, "rollout": 0, "bloqueadores": 6}),
                ("api/estrella", {"rival": eq}),
                ("api/repeticion", {"rival": eq}),
            )
        ]
        for ruta, params in llamadas[:5]:      # calienta la conexión (el primer connect a localhost cuesta ~2 s)
            cliente.get(f"{BASE}/{ruta}", params=params)
        peor: dict[str, float] = {}
        for ruta, params in llamadas:
            t = time.perf_counter()
            r = cliente.get(f"{BASE}/{ruta}", params=params)
            peor[ruta] = max(peor.get(ruta, 0.0), time.perf_counter() - t)
            if r.status_code != 200:
                print(f"  FALLO {ruta} {params}: {r.status_code} {r.text}")
                fallos += 1
        print(f"  {len(llamadas)} llamadas (32 equipos). Más lenta por ruta, el contrato pide < 1000 ms:")
        for ruta, s in sorted(peor.items()):
            print(f"    {ruta:18s} {s * 1000:6.1f} ms")
        nulos = [eq for eq in equipos
                 if any(cliente.get(f"{BASE}/api/estrella", params={"rival": eq}).json()[k] is None
                        for k in ("con", "sin"))]
        print(f"  api/estrella con grupo null (menos de 20 jugadas o sin tiempo seguro): {', '.join(nulos) or 'ninguno'}")
        print("\nRESULTADO: " + ("todo como pide el contrato" if not fallos else f"{fallos} fallo(s)"))
        return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
