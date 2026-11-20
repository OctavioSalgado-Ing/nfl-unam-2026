"""Motor de datos de la Hoja de Protección.

Construye UNA vez en memoria, con las definiciones de .kiro/steering/equipo.md:

- ``jugadas``: una fila por jugada con Inicio y Fin (presión, reloj, lado, presionador y contexto PFF).
- ``duelos``: una fila por duelo bloqueador-defensor de PFF (``Pass Block`` con jugador bloqueado).
- ``roles``: QB, rushers y bloqueadores de cada jugada (titulares y "Sin su estrella").
- ``posiciones``: tracking de QB, rushers y bloqueadores entre Inicio y Fin, solo de jugadas con
  presión (lo usa la Repetición).

Solo lee ``data/`` con rutas relativas a la raíz del proyecto y nunca escribe a disco.
"""
from __future__ import annotations

import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"

EVENTOS_INICIO = ("ball_snap", "autoevent_ballsnap")
EVENTOS_FIN = ("pass_forward", "autoevent_passforward", "qb_sack", "qb_strip_sack", "run", "fumble")
FRAMES_ANTES_DE_PRESION = 5   # la presión se busca desde Inicio + 5 frames
RADIO_PRESION_YD = 2.0        # un rusher a <= 2.0 yd del QB
UMBRAL_LADO_YD = 1.0          # |dy| > 1 yd define izquierda / derecha
ROLES = {"Pass": "Q", "Pass Rush": "R", "Pass Block": "B"}

CLAVE = ["gameId", "playId"]
COLS_TRACKING = ["gameId", "playId", "nflId", "frameId", "x", "y", "event", "playDirection"]
TIPOS_TRACKING = {
    "gameId": "int32", "playId": "int16", "nflId": "float32", "frameId": "int16",
    "x": "float32", "y": "float32", "event": "category", "playDirection": "category",
}


@dataclass
class Datos:
    jugadas: pd.DataFrame
    duelos: pd.DataFrame
    roles: pd.DataFrame
    posiciones: pd.DataFrame
    nombres: dict[int, str]
    segundos_carga: float


def _leer_tablas(carpeta: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict[int, str]]:
    plays = pd.read_csv(
        carpeta / "plays.csv",
        usecols=["gameId", "playId", "down", "yardsToGo", "possessionTeam", "defensiveTeam", "passResult",
                 "prePenaltyPlayResult", "dropBackType", "pff_playAction", "pff_passCoverageType"],
        dtype={"gameId": "int32", "playId": "int16", "down": "int8", "yardsToGo": "int8",
               "prePenaltyPlayResult": "int16", "pff_playAction": "int8"},
    )
    pff = pd.read_csv(
        carpeta / "pffScoutingData.csv",
        usecols=["gameId", "playId", "nflId", "pff_role", "pff_positionLinedUp", "pff_hit", "pff_hurry", "pff_sack",
                 "pff_hitAllowed", "pff_hurryAllowed", "pff_sackAllowed", "pff_nflIdBlockedPlayer"],
        dtype={"gameId": "int32", "playId": "int16", "nflId": "int32",
               "pff_hit": "float32", "pff_hurry": "float32", "pff_sack": "float32",
               "pff_hitAllowed": "float32", "pff_hurryAllowed": "float32", "pff_sackAllowed": "float32",
               "pff_nflIdBlockedPlayer": "float32"},
    )
    games = pd.read_csv(carpeta / "games.csv", usecols=["gameId", "week"], dtype={"gameId": "int32", "week": "int8"})
    players = pd.read_csv(carpeta / "players.csv", usecols=["nflId", "displayName"])
    nombres = dict(zip(players["nflId"].astype(int), players["displayName"].astype(str)))
    return plays, pff, games, nombres


def _leer_partido(ruta: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Un archivo de tracking (un partido) -> (Inicio/Fin/dirección por jugada, filas de jugadores entre Inicio y Fin).

    Solo hace lo barato (se corre en hilos); los merges pesados van una sola vez sobre todos los partidos.
    """
    # En estos CSV los vacíos son "NA" y los frames sin evento dicen "None".
    t = pd.read_csv(ruta, usecols=COLS_TRACKING, dtype=TIPOS_TRACKING, na_values=["NA", "None"], keep_default_na=False)

    # Inicio y Fin: primer frame con cada tipo de evento (el evento se repite en todas las filas del frame).
    ev = t.loc[t["event"].notna(), ["gameId", "playId", "frameId", "event", "playDirection"]]
    inicio = (
        ev.loc[ev["event"].isin(EVENTOS_INICIO)]
        .groupby(CLAVE, observed=True)
        .agg(inicio=("frameId", "min"), direccion=("playDirection", "first"))
    )
    fin = ev.loc[ev["event"].isin(EVENTOS_FIN)].groupby(CLAVE)["frameId"].min().rename("fin")
    marcas = inicio.join(fin, how="inner").reset_index()
    marcas = marcas.loc[marcas["fin"] > marcas["inicio"]].reset_index(drop=True)
    marcas["direccion"] = marcas["direccion"].astype(str)

    # Recorte a la ventana [Inicio, Fin] de cada jugada (búsqueda vectorizada por clave gameId-playId).
    def clave(df: pd.DataFrame) -> np.ndarray:
        return df["gameId"].to_numpy("int64") * 100_000 + df["playId"].to_numpy("int64")

    i = pd.Index(clave(marcas)).get_indexer(clave(t))
    en_jugada = i >= 0
    i = np.where(en_jugada, i, 0)
    ini = marcas["inicio"].to_numpy()[i]
    frame = t["frameId"].to_numpy()
    dentro = en_jugada & t["nflId"].notna().to_numpy() & (frame >= ini) & (frame <= marcas["fin"].to_numpy()[i])
    filas = t.loc[dentro, ["gameId", "playId", "nflId", "frameId", "x", "y"]].astype({"nflId": "int32"})
    filas["inicio"] = ini[dentro]
    return marcas, filas


def _tracking(carpeta: Path, roles: pd.DataFrame, t0: float) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Lee el tracking archivo por archivo (en hilos) y calcula presión, reloj, lado y presionador por jugada."""
    archivos = sorted((carpeta / "tracking").glob("tracking_*.csv"))
    if not archivos:
        raise FileNotFoundError(f"No hay archivos tracking_*.csv en {carpeta / 'tracking'}")
    lista_marcas, lista_filas = [], []
    with ThreadPoolExecutor(max_workers=min(8, os.cpu_count() or 1)) as ex:
        futuros = [ex.submit(_leer_partido, a) for a in archivos]
        for n, fut in enumerate(as_completed(futuros), 1):
            m, f = fut.result()
            lista_marcas.append(m)
            lista_filas.append(f)
            if n % 20 == 0 or n == len(archivos):
                print(f"[motor] tracking {n}/{len(archivos)} archivos ({time.perf_counter() - t0:.1f} s)", flush=True)
    marcas = pd.concat(lista_marcas, ignore_index=True)
    filas = pd.concat(lista_filas, ignore_index=True)
    del lista_filas

    # Solo QB, rushers y bloqueadores.
    pos = filas.merge(roles[CLAVE + ["nflId", "rol"]], on=CLAVE + ["nflId"], how="inner")
    del filas
    es_qb = (pos["rol"] == "Q").to_numpy()
    qb = pos.loc[es_qb, ["gameId", "playId", "frameId", "x", "y"]]
    qb0 = (
        pos.loc[es_qb & (pos["frameId"] == pos["inicio"]).to_numpy(), CLAVE + ["x", "y"]]
        .drop_duplicates(CLAVE)
        .rename(columns={"x": "x0", "y": "y0"})
    )
    marcas = marcas.merge(qb0, on=CLAVE, how="left")

    # Presión: primer frame entre Inicio+5 y Fin con un rusher a <= 2.0 yd del QB (el más cercano en ese frame).
    rush = pos.loc[
        (pos["rol"] == "R").to_numpy() & (pos["frameId"] >= pos["inicio"] + FRAMES_ANTES_DE_PRESION).to_numpy(),
        ["gameId", "playId", "nflId", "frameId", "x", "y"],
    ]
    par = rush.merge(qb, on=["gameId", "playId", "frameId"], suffixes=("", "_qb"))
    par["dist"] = np.hypot(
        par["x"].to_numpy("float64") - par["x_qb"].to_numpy("float64"),
        par["y"].to_numpy("float64") - par["y_qb"].to_numpy("float64"),
    )
    primera = (
        par.loc[par["dist"] <= RADIO_PRESION_YD]
        .sort_values(["gameId", "playId", "frameId", "dist"])
        .drop_duplicates(CLAVE)
        .merge(marcas[CLAVE + ["direccion"]], on=CLAVE)
    )
    # Lado desde la vista del QB: dy = y_rusher - y_qb; si el ataque va a la izquierda, se invierte.
    dy = primera["y"].to_numpy("float64") - primera["y_qb"].to_numpy("float64")
    dy = np.where(primera["direccion"].to_numpy() == "left", -dy, dy)
    primera["lado"] = np.select([dy > UMBRAL_LADO_YD, dy < -UMBRAL_LADO_YD], ["izquierda", "derecha"], "centro")
    marcas = marcas.merge(
        primera[CLAVE + ["frameId", "nflId", "lado"]].rename(columns={"frameId": "frame_presion", "nflId": "presionador"}),
        on=CLAVE,
        how="left",
    )

    posiciones = pos.merge(primera[CLAVE], on=CLAVE)[["gameId", "playId", "nflId", "frameId", "x", "y", "rol"]]
    print(f"[motor] presión calculada ({time.perf_counter() - t0:.1f} s)", flush=True)
    return marcas, posiciones


def cargar(carpeta: Path = DATA) -> Datos:
    """Lee los CSV una sola vez y devuelve las tablas en memoria."""
    t0 = time.perf_counter()
    print("[motor] Leyendo plays, PFF, partidos y jugadores...", flush=True)
    plays, pff, games, nombres = _leer_tablas(carpeta)

    rol = pff["pff_role"].map(ROLES)
    roles = pff.loc[rol.notna(), CLAVE + ["nflId", "pff_positionLinedUp"]].rename(columns={"pff_positionLinedUp": "posicion"})
    roles["rol"] = pd.Categorical(rol[rol.notna()], categories=["Q", "R", "B"])
    roles = roles.reset_index(drop=True)

    marcas, posiciones = _tracking(carpeta, roles, t0)

    # Tabla por jugada: solo las que tienen Inicio y Fin (inner join).
    jug = plays.merge(marcas, on=CLAVE, how="inner").merge(games, on="gameId", how="left")
    cuenta = roles.groupby(CLAVE + ["rol"], observed=False).size().unstack(fill_value=0)
    cuenta = cuenta.rename(columns={"R": "n_rush", "B": "n_bloq"})[["n_rush", "n_bloq"]].reset_index()
    jug = jug.merge(cuenta, on=CLAVE, how="left")
    qb = roles.loc[roles["rol"] == "Q", CLAVE + ["nflId"]].drop_duplicates(CLAVE).rename(columns={"nflId": "qb"})
    jug = jug.merge(qb, on=CLAVE, how="left")
    rush = pff.loc[pff["pff_role"] == "Pass Rush"]
    golpe = (rush["pff_hit"] == 1) | (rush["pff_hurry"] == 1) | (rush["pff_sack"] == 1)
    pff_presion = golpe.groupby([rush["gameId"], rush["playId"]]).any().rename("pff_presion").reset_index()
    jug = jug.merge(pff_presion, on=CLAVE, how="left")

    down, ytg = jug["down"], jug["yardsToGo"]
    jugadas = pd.DataFrame({
        "gameId": jug["gameId"],
        "playId": jug["playId"],
        "semana": jug["week"],
        "ofensiva": jug["possessionTeam"].astype(str),
        "defensa": jug["defensiveTeam"].astype(str),
        "down": down,
        "yardas_por_ganar": ytg,
        "yardas": jug["prePenaltyPlayResult"],
        "pa": jug["pff_playAction"] == 1,
        "rollout": jug["dropBackType"].fillna("").str.startswith("DESIGNED_ROLLOUT"),
        "tradicional": jug["dropBackType"] == "TRADITIONAL",
        "zona": jug["pff_passCoverageType"] == "Zone",
        "n_rush": jug["n_rush"].fillna(0).astype("int8"),
        "n_bloq": jug["n_bloq"].fillna(0).astype("int8"),
        "qb": jug["qb"].astype("Int32"),
        "inicio": jug["inicio"].astype("int16"),
        "fin": jug["fin"].astype("int16"),
        "direccion": jug["direccion"],
        "x0": jug["x0"],
        "y0": jug["y0"],
        "presionador": jug["presionador"].astype("Int32"),
        "lado": jug["lado"],
        "pff_presion": jug["pff_presion"].eq(True),
        "sack": jug["passResult"] == "S",
    })
    jugadas["lanzamiento_f"] = (jugadas["fin"] - jugadas["inicio"]).astype("int16")
    jugadas["reloj_f"] = jug["frame_presion"] - jug["inicio"]          # frames; NaN si no hubo presión
    jugadas["presion"] = jugadas["reloj_f"].notna()
    jugadas["blitz"] = jugadas["n_rush"] >= 5
    jugadas["situacion"] = np.select(
        [down.isin([1, 2]), (down == 3) & ytg.between(1, 3), (down == 3) & ytg.between(4, 6), down.isin([3, 4]) & (ytg >= 7)],
        ["a", "c", "m", "l"],
        default="",
    )

    # Tabla por duelo: fila "Pass Block" con jugador bloqueado; perdido si permitió hurry, hit o sack.
    pb = pff.loc[(pff["pff_role"] == "Pass Block") & pff["pff_nflIdBlockedPlayer"].notna()]
    duelos = pd.DataFrame({
        "gameId": pb["gameId"],
        "playId": pb["playId"],
        "bloqueador": pb["nflId"],
        "defensor": pb["pff_nflIdBlockedPlayer"].astype("int32"),
        "posicion": pb["pff_positionLinedUp"],
        "perdido": (pb["pff_hurryAllowed"] == 1) | (pb["pff_hitAllowed"] == 1) | (pb["pff_sackAllowed"] == 1),
    }).merge(
        plays[CLAVE + ["possessionTeam", "defensiveTeam"]].rename(columns={"possessionTeam": "ofensiva", "defensiveTeam": "defensa"}),
        on=CLAVE,
        how="inner",
    ).reset_index(drop=True)

    roles = roles.merge(plays[CLAVE + ["possessionTeam", "defensiveTeam"]], on=CLAVE, how="left").rename(
        columns={"possessionTeam": "ofensiva", "defensiveTeam": "defensa"}
    )
    posiciones["rol"] = posiciones["rol"].astype(str)

    segundos = time.perf_counter() - t0
    print(
        f"[motor] Listo: {len(jugadas):,} jugadas, {len(duelos):,} duelos, {len(posiciones):,} posiciones "
        f"en {segundos:.1f} s",
        flush=True,
    )
    return Datos(jugadas=jugadas, duelos=duelos, roles=roles, posiciones=posiciones, nombres=nombres,
                 segundos_carga=segundos)
