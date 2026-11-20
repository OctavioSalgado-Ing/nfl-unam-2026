/**
 * Espejo exacto del contrato de .kiro/steering/equipo.md y de backend/contrato.py.
 * Porcentajes enteros de 0 a 100; segundos con 1 decimal. Los campos opcionales son `T | null`.
 */

export type Nivel = 'rojo' | 'amarillo' | 'verde'
export type Lado = 'izquierda' | 'centro' | 'derecha'
export type Fuente = 'rival' | 'liga'
export type Rol = 'Q' | 'R' | 'B' | 'E'
export type Sit = 'a' | 'c' | 'm' | 'l'

/** GET api/opciones */
export interface Opciones {
  equipos: string[]
  validacion_pct: number
}

export interface QB {
  nombre: string
  lanzamiento_s: number
  diferencia_s: number
}

export interface Lados {
  izquierda: number
  centro: number
  derecha: number
}

export interface Amenaza {
  nombre: string
  gana_pct: number | null
  lado: Lado
}

export interface Bloqueador {
  nombre: string
  posicion: string
  pierde_pct: number
}

export interface Clave {
  accion: string
  dato: string
}

/** Cada par es [rival, liga]. */
export interface Contexto {
  presion: [number, number]
  tercer_down: [number, number]
  blitz: [number, number]
}

/** GET api/partido?ofensiva=&rival= */
export interface Partido {
  tiempo_seguro_s: number
  tiempo_seguro_liga_s: number
  nivel: Nivel
  qb: QB
  lados: Lados
  amenaza: Amenaza
  bloqueador: Bloqueador
  claves: Clave[]
  contexto: Contexto
}

/** GET api/situacion?rival=&sit=a|c|m|l */
export interface Situacion {
  presion_pct: number
  presion_liga_pct: number
  blitz_pct: number
  blitz_liga_pct: number
  fuente: Fuente
  accion: string
  detalle: string
  nivel: Nivel
}

/** GET api/escenario?rival=&pa=0|1&rollout=0|1&bloqueadores=5|6|7 */
export interface Escenario {
  presion_actual_pct: number
  presion_esperada_pct: number
  yardas_delta: number
}

export interface GrupoEstrella {
  tiempo_seguro_s: number
  presion_pct: number
  n: number
}

/** GET api/estrella?rival= */
export interface Estrella {
  nombre: string
  con: GrupoEstrella | null
  sin: GrupoEstrella | null
}

export interface Punto {
  rol: Rol
  x: number
  y: number
}

/** GET api/repeticion?rival= */
export interface Repeticion {
  descripcion: string
  reloj_s: number
  fin_s: number
  frames: Punto[][]
}
