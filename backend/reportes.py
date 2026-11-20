"""Reportes de la Hoja de Protección.

Funciones puras que devuelven dicts con EXACTAMENTE la forma del contrato de .kiro/steering/equipo.md.
``cargar()`` construye las tablas del motor una sola vez y precalcula todas las respuestas por equipo
(caché en dicts en memoria); después cada función solo consulta la caché. Nunca escribe a disco.

Redondeo: porcentajes enteros de 0 a 100 y segundos con 1 decimal.
Prueba:  .venv\\Scripts\\python -m backend.reportes
"""
from __future__ import annotations

import copy
import math
import threading
import time

import numpy as np
import pandas as pd

from . import motor

LADOS = ("izquierda", "centro", "derecha")
SITUACIONES = ("a", "c", "m", "l")
BLOQUEADORES = (5, 6, 7)
LINEA = ("LT", "LG", "C", "RG", "RT")
MIN_DUELOS = 100              # gana_pct del defensor
MIN_JUGADAS = 20              # situación, play action y con/sin estrella
PCT_TIEMPO_SEGURO = 15        # % de jugadas con Reloj <= t
MARGEN_NIVEL_F = 1.5          # 0.15 s expresado en frames
UMBRAL_CLAVE = 0.3
MAX_CLAVES = 3
RELOJ_REPETICION_F = (22, 28)  # Reloj entre 2.2 y 2.8 s

_cache: dict = {}
_candado = threading.Lock()


# ----------------------------------------------------------------------------- utilidades
def _pct(fraccion: float) -> int:
    """Fracción 0-1 -> porcentaje entero 0-100."""
    return int(math.floor(float(fraccion) * 100 + 0.5))


def _dec(valor: float) -> float:
    """Redondeo a 1 decimal."""
    return math.floor(float(valor) * 10 + 0.5) / 10


def _ts_frames(reloj_f) -> int | None:
    """Tiempo seguro en frames: primer t (pasos de 0.1 s) en que el % de jugadas con Reloj <= t llega a 15%."""
    r = np.asarray(reloj_f, dtype="float64")
    if len(r) == 0:
        return None
    k = -(-PCT_TIEMPO_SEGURO * len(r) // 100)          # ceil(0.15 * n) sin errores de punto flotante
    v = np.sort(r[~np.isnan(r)])
    return int(v[k - 1]) if len(v) >= k else None


def _seg(frames: int | None) -> float | None:
    return None if frames is None else frames / 10


def _reparto(conteos: pd.Series) -> dict[str, int]:
    """Porcentajes enteros por lado que suman 100 (mayor residuo)."""
    total = int(conteos.sum())
    if total == 0:
        return {lado: 0 for lado in LADOS}
    exactos = {lado: int(conteos.get(lado, 0)) * 100 / total for lado in LADOS}
    base = {lado: int(math.floor(v)) for lado, v in exactos.items()}
    orden = sorted(LADOS, key=lambda lado: (-(exactos[lado] - base[lado]), LADOS.index(lado)))
    for lado in orden[: 100 - sum(base.values())]:
        base[lado] += 1
    return base


def _moda_lado(lados: pd.Series) -> str:
    c = lados.value_counts()
    return max(LADOS, key=lambda lado: (int(c.get(lado, 0)), -LADOS.index(lado)))


def _z(valor: float, serie: pd.Series) -> float:
    """z = (valor - promedio de las 32 defensas) / desviación estándar de las 32 defensas."""
    v = serie.dropna().astype("float64")
    sd = float(v.std(ddof=0)) if len(v) else 0.0
    return 0.0 if not sd or math.isnan(sd) else (float(valor) - float(v.mean())) / sd


def _signo(x: float) -> str:
    x = _dec(x)
    return f"+{x:.1f}" if x > 0 else f"{x:.1f}"


def _media(s: pd.Series) -> float:
    return float(s.mean()) if len(s) else float("nan")


# ----------------------------------------------------------------------------- precálculo
def _liga(j: pd.DataFrame, d: motor.Datos) -> dict:
    d12 = j.loc[j["down"].isin([1, 2])]
    pres = j.loc[j["presion"], "lado"]
    return {
        "n": len(j),
        "reloj": j["reloj_f"].to_numpy("float64"),
        "ts_f": _ts_frames(j["reloj_f"]),
        "presion": _media(j["presion"]),
        "tercer": _media(j.loc[j["down"] == 3, "presion"]),
        "blitz": _media(j["blitz"]),
        "no_zona": 1 - _media(j["zona"]),
        "lados": _reparto(pres.value_counts()),
        "validacion": _media(j["presion"] == j["pff_presion"]),
        "duelo": _media(d.duelos["perdido"]),
        "pa_delta": _media(d12.loc[d12["pa"], "yardas"]) - _media(d12.loc[~d12["pa"], "yardas"]),
        "sit": {
            s: (_media(j.loc[j["situacion"] == s, "presion"]), _media(j.loc[j["situacion"] == s, "blitz"]))
            for s in SITUACIONES
        },
    }


def _defensas(j: pd.DataFrame, d: motor.Datos) -> dict[str, dict]:
    por_def = d.duelos.groupby("defensor")["perdido"].agg(["size", "mean"])
    gana = (por_def.loc[por_def["size"] >= MIN_DUELOS, "mean"] * 100).to_dict()

    pres = j.loc[j["presion"], ["defensa", "presionador", "lado"]]
    conteo = pres.groupby(["defensa", "presionador"]).size().rename("n").reset_index()
    conteo = conteo.sort_values(["defensa", "n", "presionador"], ascending=[True, False, True]).drop_duplicates("defensa")
    amenaza = dict(zip(conteo["defensa"], conteo["presionador"].astype(int)))

    out = {}
    for eq, g in j.groupby("defensa"):
        star = amenaza[eq]
        conteo_lados = g.loc[g["presion"], "lado"].value_counts()
        lados = _reparto(conteo_lados)
        total_pres = max(int(conteo_lados.sum()), 1)
        fuerte = "izquierda" if lados["izquierda"] >= lados["derecha"] else "derecha"
        g12 = g.loc[g["down"].isin([1, 2])]
        out[eq] = {
            "n": len(g),
            "reloj": g["reloj_f"].to_numpy("float64"),
            "ts_f": _ts_frames(g["reloj_f"]),
            "presion": _media(g["presion"]),
            "tercer": _media(g.loc[g["down"] == 3, "presion"]),
            "blitz": _media(g["blitz"]),
            "no_zona": 1 - _media(g["zona"]),
            "lados": lados,
            "fuerte": fuerte,
            "fuerte_frac": int(conteo_lados.get(fuerte, 0)) / total_pres,
            "amenaza": star,
            "amenaza_presiones": int(conteo.loc[conteo["defensa"] == eq, "n"].iloc[0]),
            "lado_amenaza": _moda_lado(pres.loc[(pres["defensa"] == eq) & (pres["presionador"] == star), "lado"]),
            "gana": gana.get(star),
            "pa_n": int(g12["pa"].sum()),
            "pa_delta": _media(g12.loc[g12["pa"], "yardas"]) - _media(g12.loc[~g12["pa"], "yardas"]),
        }
    return out


def _ofensivas(j: pd.DataFrame, d: motor.Datos) -> dict[str, dict]:
    q = j.groupby(["ofensiva", "qb"]).size().rename("n").reset_index()
    q = q.sort_values(["ofensiva", "n", "qb"], ascending=[True, False, True]).drop_duplicates("ofensiva")
    pierde = (d.duelos.groupby("bloqueador")["perdido"].mean() * 100).to_dict()

    b = d.roles.loc[(d.roles["rol"] == "B") & d.roles["posicion"].isin(LINEA)]
    c = b.groupby(["ofensiva", "posicion", "nflId"]).size().rename("n").reset_index()
    c = c.sort_values(["ofensiva", "posicion", "n", "nflId"], ascending=[True, True, False, True])
    c = c.drop_duplicates(["ofensiva", "posicion"])
    titulares: dict[str, dict[str, int]] = {}
    for of, pos, i in zip(c["ofensiva"], c["posicion"], c["nflId"]):
        titulares.setdefault(of, {})[pos] = int(i)

    out = {}
    for of, qb in zip(q["ofensiva"], q["qb"].astype(int)):
        # Lanzamiento típico de mi QB: mediana de sus jugadas (un scramble de 7 s no la infla).
        lanz_f = float(j.loc[(j["ofensiva"] == of) & (j["qb"] == qb), "lanzamiento_f"].median())
        out[of] = {
            "qb": qb,
            "lanz_d": int(math.floor(lanz_f + 0.5)),         # décimas de segundo (1 frame = 0.1 s)
            "titulares": titulares.get(of, {}),
            "pierde": {pos: pierde.get(i) for pos, i in titulares.get(of, {}).items()},
        }
    return out


def _bloqueador(o: dict, lado: str, nombre) -> dict:
    """izquierda -> LT, derecha -> RT, centro -> el que más pierde entre LG, C y RG."""
    if lado == "izquierda":
        pos = "LT"
    elif lado == "derecha":
        pos = "RT"
    else:
        pos = max(("LG", "C", "RG"), key=lambda p: -1.0 if o["pierde"].get(p) is None else o["pierde"][p])
    i = o["titulares"].get(pos)
    pierde = o["pierde"].get(pos)
    return {
        "nombre": nombre(i) if i is not None else "Sin titular",
        "posicion": pos,
        "pierde_pct": None if pierde is None else _dec(pierde),
    }


def _texto_lado(lado: str) -> str:
    return "el centro" if lado == "centro" else f"tu {lado}"


def _claves(o: dict, dv: dict, L: dict, Z: pd.DataFrame, bloq: dict, nombre) -> list[dict]:
    """Candidatas y puntajes de equipo.md; se quedan las de puntaje > 0.3, de mayor a menor, máximo 3."""
    cands: list[tuple[float, int, str, str]] = []
    ts_f, tsl_f = dv["ts_f"], L["ts_f"]
    ts, tsl = ts_f / 10, tsl_f / 10

    # 1. Suelta antes de {ts} s
    lz_d = o["lanz_d"]
    p_rv = _pct(np.mean(dv["reloj"] <= lz_d))
    p_lg = _pct(np.mean(L["reloj"] <= lz_d))
    s1 = -_z(ts, Z["ts"]) + max(0, lz_d - ts_f) / 10 / 0.3
    cands.append((s1, 1, f"Suelta antes de {ts:.1f} s", f"A {lz_d / 10:.1f} s ya llegan en {p_rv}% · liga {p_lg}%"))

    # 2. Ayuda extra contra {amenaza}
    if dv["gana"] is not None:
        s2 = _z(dv["gana"], Z["gana"])
        if bloq["pierde_pct"] is not None:
            s2 += (bloq["pierde_pct"] - 6) / 3
        cands.append((s2, 2, f"Ayuda extra contra {nombre(dv['amenaza'])}",
                      f"Llega por {_texto_lado(dv['lado_amenaza'])} · gana {_dec(dv['gana']):.1f}% de duelos · "
                      f"liga {_dec(L['duelo'] * 100):.1f}%"))

    # 3. Usa play action en 1º y 2º
    if dv["pa_n"] >= MIN_JUGADAS and _dec(dv["pa_delta"]) >= 0.5:
        cands.append((_z(dv["pa_delta"], Z["pa_delta"]), 3, "Usa play action en 1º y 2º",
                      f"Contra ellos suma {_signo(dv['pa_delta'])} yd por jugada · liga {_signo(L['pa_delta'])} yd"))

    # 4. En 3er down, suelta en menos de 2 s
    if _pct(dv["tercer"]) > _pct(L["tercer"]):
        cands.append((_z(dv["tercer"], Z["tercer"]), 4, "En 3er down, suelta en menos de 2 s",
                      f"Presionan {_pct(dv['tercer'])}% en 3er down · liga {_pct(L['tercer'])}%"))

    # 5. Si mandan blitz, pase rápido
    if _pct(dv["blitz"]) >= _pct(L["blitz"]):
        cands.append((_z(dv["blitz"], Z["blitz"]), 5, "Si mandan blitz, pase rápido",
                      f"Mandan blitz en {_pct(dv['blitz'])}% de jugadas · liga {_pct(L['blitz'])}%"))

    # 6. Rutas que se separen rápido
    if _pct(dv["no_zona"]) >= 40:
        cands.append((_z(dv["no_zona"], Z["no_zona"]), 6, "Rutas que se separen rápido",
                      f"No juegan zona en {_pct(dv['no_zona'])}% · liga {_pct(L['no_zona'])}%"))

    # 7. Mueve al QB a la {lado débil}
    fuerte = dv["fuerte"]
    if dv["lados"][fuerte] >= 40:
        debil = "derecha" if fuerte == "izquierda" else "izquierda"
        cands.append((_z(dv["fuerte_frac"], Z["fuerte_frac"]), 7, f"Mueve al QB a la {debil}",
                      f"{dv['lados'][fuerte]}% de su presión llega por la {fuerte} · liga {L['lados'][fuerte]}%"))

    # 8. Hay tiempo: busca el pase largo
    if ts_f > tsl_f:
        sd = float(Z["ts"].std(ddof=0))
        if sd > 0:
            cands.append(((ts - tsl) / sd, 8, "Hay tiempo: busca el pase largo",
                          f"Tiempo seguro {ts:.1f} s · liga {tsl:.1f} s"))

    elegidas = sorted((c for c in cands if c[0] > UMBRAL_CLAVE), key=lambda c: (-c[0], c[1]))[:MAX_CLAVES]
    return [{"accion": accion, "dato": dato} for _, _, accion, dato in elegidas]


def _situacion(dv_jugadas: pd.DataFrame, s: str, L: dict) -> dict:
    gs = dv_jugadas.loc[dv_jugadas["situacion"] == s]
    pl, bl = L["sit"][s]
    if len(gs) >= MIN_JUGADAS:
        p, b, fuente = _media(gs["presion"]), _media(gs["blitz"]), "rival"
    else:
        p, b, fuente = pl, bl, "liga"
    P, PL, B, BL = _pct(p), _pct(pl), _pct(b), _pct(bl)
    if P >= PL + 8:
        accion, detalle, nivel = "Suelta en menos de 2 s", "Pase corto y seguro", "rojo"
    elif P <= PL - 8:
        accion, detalle, nivel = "Hay tiempo", "Busca el pase largo", "verde"
    else:
        accion, detalle, nivel = "Presión normal", "Juega tu jugada", "amarillo"
    if B >= BL + 10:
        detalle = "Blitz probable: lectura rápida"
    return {"presion_pct": P, "presion_liga_pct": PL, "blitz_pct": B, "blitz_liga_pct": BL,
            "fuente": fuente, "accion": accion, "detalle": detalle, "nivel": nivel}


def _efectos(j: pd.DataFrame) -> dict:
    """Multiplicador de presión y delta de yardas de cada opción contra su base, con toda la liga."""
    def efecto(opcion: pd.Series, base: pd.Series) -> tuple[float, float]:
        mult = _media(j.loc[opcion, "presion"]) / _media(j.loc[base, "presion"])
        delta = _media(j.loc[opcion, "yardas"]) - _media(j.loc[base, "yardas"])
        return mult, delta

    return {
        "pa": efecto(j["pa"], ~j["pa"]),
        "rollout": efecto(j["rollout"], j["tradicional"]),
        6: efecto(j["n_bloq"] == 6, j["n_bloq"] == 5),
        7: efecto(j["n_bloq"] == 7, j["n_bloq"] == 5),
    }


def _escenario(presion: float, ef: dict, pa: int, rollout: int, bloqueadores: int) -> dict:
    mult, delta = 1.0, 0.0
    for activo, clave in ((pa, "pa"), (rollout, "rollout"), (bloqueadores != 5, bloqueadores)):
        if activo:
            mult *= ef[clave][0]
            delta += ef[clave][1]
    return {
        "presion_actual_pct": _pct(presion),
        "presion_esperada_pct": _pct(min(1.0, max(0.0, presion * mult))),
        "yardas_delta": _dec(delta),
    }


def _claves_jugada(df: pd.DataFrame) -> np.ndarray:
    return df["gameId"].to_numpy("int64") * 100_000 + df["playId"].to_numpy("int64")


def _estrella(g: pd.DataFrame, star: int, roles: pd.DataFrame, nombre) -> dict:
    rush = roles.loc[(roles["rol"] == "R") & (roles["nflId"] == star)]
    con = np.isin(_claves_jugada(g), _claves_jugada(rush))

    def grupo(sub: pd.DataFrame) -> dict | None:
        # null si hay menos de 20 jugadas o si su presión nunca llega al 15% (sin tiempo seguro no hay dato).
        ts = _ts_frames(sub["reloj_f"]) if len(sub) >= MIN_JUGADAS else None
        if ts is None:
            return None
        return {"tiempo_seguro_s": _seg(ts), "presion_pct": _pct(_media(sub["presion"])), "n": int(len(sub))}

    return {"nombre": nombre(star), "con": grupo(g.loc[con]), "sin": grupo(g.loc[~con])}


def _repeticion(g: pd.DataFrame, star: int, posiciones: pd.DataFrame, nombre) -> dict:
    """Una jugada real: presión de la amenaza #1 con Reloj entre 2.2 y 2.8 s (prefiere sack)."""
    lo, hi = RELOJ_REPETICION_F
    p = g.loc[g["presion"] & g["x0"].notna()]
    opciones = (
        p.loc[(p["presionador"] == star) & p["reloj_f"].between(lo, hi)],
        p.loc[p["presionador"] == star],
        p.loc[p["reloj_f"].between(lo, hi)],
        p,
    )
    cand = next(c for c in opciones if len(c))
    cand = cand.assign(_no_sack=~cand["sack"], _dist=(cand["reloj_f"] - (lo + hi) / 2).abs())
    jug = cand.sort_values(["_no_sack", "_dist", "gameId", "playId"]).iloc[0]

    f = posiciones.loc[(posiciones["gameId"] == jug["gameId"]) & (posiciones["playId"] == jug["playId"])]
    f = f.loc[(f["frameId"] - int(jug["inicio"])) % 2 == 0]
    s = -1.0 if jug["direccion"] == "left" else 1.0
    x = np.round((f["x"].to_numpy("float64") - float(jug["x0"])) * s, 2)
    y = np.round((f["y"].to_numpy("float64") - float(jug["y0"])) * s, 2)
    rol = np.where((f["rol"].to_numpy() == "R") & (f["nflId"].to_numpy() == star), "E", f["rol"].to_numpy())
    orden = {"Q": 0, "B": 1, "R": 2, "E": 3}
    tabla = pd.DataFrame({"frame": f["frameId"].to_numpy(), "rol": rol, "x": x, "y": y})
    tabla["_o"] = tabla["rol"].map(orden)
    tabla = tabla.sort_values(["frame", "_o", "x", "y"])
    frames = [
        [{"rol": str(r), "x": float(a), "y": float(b)} for r, a, b in zip(t["rol"], t["x"], t["y"])]
        for _, t in tabla.groupby("frame", sort=True)
    ]

    quien = int(jug["presionador"])
    reloj = int(jug["reloj_f"]) / 10
    partes = [f"{jug['ofensiva']} vs {jug['defensa']}", f"Semana {int(jug['semana'])}"]
    if 1 <= int(jug["down"]) <= 4:
        partes.append(f"{int(jug['down'])}º y {int(jug['yardas_por_ganar'])}")
    partes.append(f"{nombre(quien)} llega a {reloj:.1f} s" + (" · sack" if bool(jug["sack"]) else ""))
    return {
        "descripcion": " · ".join(partes),
        "reloj_s": reloj,
        "fin_s": int(jug["lanzamiento_f"]) / 10,
        "frames": frames,
    }


def cargar() -> None:
    """Carga el motor una sola vez y precalcula todas las respuestas del contrato."""
    with _candado:
        if _cache:
            return
        t0 = time.perf_counter()
        d = motor.cargar()
        j = d.jugadas

        def nombre(i) -> str:
            return d.nombres.get(int(i), f"Jugador {int(i)}")

        equipos = sorted(j["defensa"].unique().tolist())
        L = _liga(j, d)
        D = _defensas(j, d)
        O = _ofensivas(j, d)
        Z = pd.DataFrame({
            eq: {"ts": dv["ts_f"] / 10, "gana": dv["gana"], "pa_delta": dv["pa_delta"], "tercer": dv["tercer"],
                 "blitz": dv["blitz"], "no_zona": dv["no_zona"], "fuerte_frac": dv["fuerte_frac"]}
            for eq, dv in D.items()
        }).T.astype("float64")
        ef = _efectos(j)

        partido_c, situacion_c, escenario_c, estrella_c, repeticion_c = {}, {}, {}, {}, {}
        for rv in equipos:
            dv = D[rv]
            g = j.loc[j["defensa"] == rv]
            for s in SITUACIONES:
                situacion_c[(rv, s)] = _situacion(g, s, L)
            for pa in (0, 1):
                for ro in (0, 1):
                    for b in BLOQUEADORES:
                        escenario_c[(rv, pa, ro, b)] = _escenario(dv["presion"], ef, pa, ro, b)
            estrella_c[rv] = _estrella(g, dv["amenaza"], d.roles, nombre)
            repeticion_c[rv] = _repeticion(g, dv["amenaza"], d.posiciones, nombre)

            ts_f, tsl_f = dv["ts_f"], L["ts_f"]
            nivel = "rojo" if ts_f < tsl_f - MARGEN_NIVEL_F else "verde" if ts_f > tsl_f + MARGEN_NIVEL_F else "amarillo"
            amenaza = {"nombre": nombre(dv["amenaza"]),
                       "gana_pct": None if dv["gana"] is None else _dec(dv["gana"]),
                       "lado": dv["lado_amenaza"]}
            contexto = {"presion": [_pct(dv["presion"]), _pct(L["presion"])],
                        "tercer_down": [_pct(dv["tercer"]), _pct(L["tercer"])],
                        "blitz": [_pct(dv["blitz"]), _pct(L["blitz"])]}
            for of in equipos:
                if of == rv:
                    continue
                o = O[of]
                bloq = _bloqueador(o, dv["lado_amenaza"], nombre)
                partido_c[(of, rv)] = {
                    "tiempo_seguro_s": ts_f / 10,
                    "tiempo_seguro_liga_s": tsl_f / 10,
                    "nivel": nivel,
                    "qb": {"nombre": nombre(o["qb"]), "lanzamiento_s": o["lanz_d"] / 10,
                           "diferencia_s": (o["lanz_d"] - ts_f) / 10},
                    "lados": dict(dv["lados"]),
                    "amenaza": dict(amenaza),
                    "bloqueador": bloq,
                    "claves": _claves(o, dv, L, Z, bloq, nombre),
                    "contexto": copy.deepcopy(contexto),
                }

        _cache.update({
            "equipos": equipos,
            "opciones": {"equipos": equipos, "validacion_pct": _dec(L["validacion"] * 100)},
            "partido": partido_c,
            "situacion": situacion_c,
            "escenario": escenario_c,
            "estrella": estrella_c,
            "repeticion": repeticion_c,
            "control": _control(j, L, D, O, estrella_c, situacion_c, nombre),
        })
        # Las posiciones solo hacían falta para las 32 repeticiones: se liberan.
        d.posiciones = d.posiciones.iloc[0:0]
        print(f"[reportes] Caché lista: {len(partido_c)} partidos en {time.perf_counter() - t0:.1f} s en total",
              flush=True)


def _control(j, L, D, O, estrella_c, situacion_c, nombre) -> dict:
    cle, no = D.get("CLE"), D.get("NO")
    return {
        "jugadas": L["n"],
        "presion_liga": _pct(L["presion"]),
        "ts_liga": L["ts_f"] / 10,
        "acuerdo_pff": _dec(L["validacion"] * 100),
        "cle_ts": None if cle is None else cle["ts_f"] / 10,
        "cle_amenaza": None if cle is None else nombre(cle["amenaza"]),
        "cle_gana": None if cle is None or cle["gana"] is None else _dec(cle["gana"]),
        "cle_lado": None if cle is None else cle["lado_amenaza"],
        "no_ts": None if no is None else no["ts_f"] / 10,
        "cle_con": estrella_c.get("CLE", {}).get("con"),
        "cle_sin": estrella_c.get("CLE", {}).get("sin"),
        "liga_12": _pct(L["sit"]["a"][0]),
        "liga_3l": _pct(L["sit"]["l"][0]),
        "cle_3l": situacion_c.get(("CLE", "l"), {}).get("presion_pct"),
    }


# ----------------------------------------------------------------------------- API pública
def _listo() -> None:
    if not _cache:
        cargar()


def _equipo(eq: str) -> None:
    if eq not in _cache["equipos"]:
        raise KeyError(f"Equipo inexistente: {eq}")


def opciones() -> dict:
    _listo()
    return copy.deepcopy(_cache["opciones"])


def partido(ofensiva: str, rival: str) -> dict:
    _listo()
    _equipo(ofensiva)
    _equipo(rival)
    if ofensiva == rival:
        raise ValueError("ofensiva y rival deben ser equipos distintos")
    return copy.deepcopy(_cache["partido"][(ofensiva, rival)])


def situacion(rival: str, sit: str) -> dict:
    _listo()
    _equipo(rival)
    if sit not in SITUACIONES:
        raise ValueError(f"sit debe ser uno de {', '.join(SITUACIONES)}")
    return copy.deepcopy(_cache["situacion"][(rival, sit)])


def escenario(rival: str, pa: int, rollout: int, bloqueadores: int) -> dict:
    _listo()
    _equipo(rival)
    if pa not in (0, 1) or rollout not in (0, 1) or bloqueadores not in BLOQUEADORES:
        raise ValueError("pa y rollout deben ser 0 o 1; bloqueadores debe ser 5, 6 o 7")
    return copy.deepcopy(_cache["escenario"][(rival, int(pa), int(rollout), int(bloqueadores))])


def estrella(rival: str) -> dict:
    _listo()
    _equipo(rival)
    return copy.deepcopy(_cache["estrella"][rival])


def repeticion(rival: str) -> dict:
    _listo()
    _equipo(rival)
    return copy.deepcopy(_cache["repeticion"][rival])


if __name__ == "__main__":
    import json
    import sys

    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    cargar()
    c = _cache["control"]

    def g(x):
        return "null" if x is None else f"{x['tiempo_seguro_s']} s / {x['presion_pct']}% (n={x['n']})"

    filas = [
        ("Jugadas", f"{c['jugadas']:,}", "~8,530"),
        ("Presión de la liga", f"{c['presion_liga']}%", "32%"),
        ("Tiempo seguro de la liga", f"{c['ts_liga']} s", "2.7 s"),
        ("Acuerdo con PFF", f"{c['acuerdo_pff']}%", "~82%"),
        ("CLE tiempo seguro", f"{c['cle_ts']} s", "2.4 s"),
        ("CLE amenaza", f"{c['cle_amenaza']} (gana {c['cle_gana']}%, {c['cle_lado']})",
         "Myles Garrett (gana ~18%, izquierda)"),
        ("NO tiempo seguro", f"{c['no_ts']} s", "3.1 s"),
        ("CLE con Garrett", g(c["cle_con"]), "2.4 s / 45%"),
        ("CLE sin Garrett", g(c["cle_sin"]), "2.9 s / 29%"),
        ("Liga presión 1º-2º", f"{c['liga_12']}%", "~28%"),
        ("Liga presión 3º largo", f"{c['liga_3l']}%", "~45%"),
        ("CLE presión 3º largo", f"{c['cle_3l']}%", "~60%"),
    ]
    print("\nValores de control")
    print(f"  {'Valor':26s} {'Calculado':42s} Esperado (data.md)")
    for nombre_, calc, esp in filas:
        print(f"  {nombre_:26s} {calc:42s} {esp}")
    tb_cle = partido("TB", "CLE")
    print(f"\nCLE: lo cuida {tb_cle['bloqueador']['nombre']} ({tb_cle['bloqueador']['posicion']})")
    print('\npartido("TB", "CLE"):')
    print(json.dumps(tb_cle, ensure_ascii=False, indent=2))
