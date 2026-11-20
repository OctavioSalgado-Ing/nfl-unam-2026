/**
 * Datos de respaldo con la forma exacta del contrato (TB vs CLE, semana 1 de 2021).
 * Solo se usan si USE_MOCK = true en client.ts: sirven para trabajar la interfaz sin backend.
 * No son un respaldo silencioso: si el backend falla, la app muestra el error, no estos números.
 */
import type { Escenario, Estrella, Opciones, Partido, Repeticion, Sit, Situacion } from './types'

export const EQUIPOS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND',
  'JAX', 'KC', 'LA', 'LAC', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF',
  'TB', 'TEN', 'WAS',
]

const opciones: Opciones = { equipos: EQUIPOS, validacion_pct: 82.4 }

const partido: Partido = {
  tiempo_seguro_s: 2.4,
  tiempo_seguro_liga_s: 2.7,
  nivel: 'rojo',
  qb: { nombre: 'Tom Brady', lanzamiento_s: 2.6, diferencia_s: 0.2 },
  lados: { izquierda: 47, centro: 22, derecha: 31 },
  amenaza: { nombre: 'Myles Garrett', gana_pct: 18.2, lado: 'izquierda' },
  bloqueador: { nombre: 'Donovan Smith', posicion: 'LT', pierde_pct: 5.1 },
  claves: [
    { accion: 'Ayuda extra contra Myles Garrett', dato: 'Llega por tu izquierda · gana 18.2% de duelos' },
    { accion: 'En 3er down, suelta en menos de 2 s', dato: 'Presionan 50% en 3er down · liga 39%' },
    { accion: 'Suelta antes de 2.4 s', dato: 'A 2.5 s ya llegan en 19% · liga 12%' },
  ],
  contexto: { presion: [42, 32], tercer_down: [50, 39], blitz: [22, 25] },
}

const situaciones: Record<Sit, Situacion> = {
  a: {
    presion_pct: 35, presion_liga_pct: 28, blitz_pct: 19, blitz_liga_pct: 22,
    fuente: 'rival', accion: 'Presión normal', detalle: 'Juega tu jugada', nivel: 'amarillo',
  },
  c: {
    presion_pct: 26, presion_liga_pct: 26, blitz_pct: 30, blitz_liga_pct: 30,
    fuente: 'liga', accion: 'Presión normal', detalle: 'Juega tu jugada', nivel: 'amarillo',
  },
  m: {
    presion_pct: 44, presion_liga_pct: 38, blitz_pct: 25, blitz_liga_pct: 27,
    fuente: 'rival', accion: 'Presión normal', detalle: 'Juega tu jugada', nivel: 'amarillo',
  },
  l: {
    presion_pct: 60, presion_liga_pct: 45, blitz_pct: 28, blitz_liga_pct: 31,
    fuente: 'rival', accion: 'Suelta en menos de 2 s', detalle: 'Pase corto y seguro', nivel: 'rojo',
  },
}

const estrella: Estrella = {
  nombre: 'Myles Garrett',
  con: { tiempo_seguro_s: 2.4, presion_pct: 45, n: 208 },
  sin: { tiempo_seguro_s: 2.9, presion_pct: 29, n: 52 },
}

/** Base 42%; el rollout la baja a 22%. Los demás ajustes se estiman igual que en el backend. */
function escenario(pa: 0 | 1, rollout: 0 | 1, bloqueadores: 5 | 6 | 7): Escenario {
  const multiplicador = (rollout ? 0.52 : 1) * (pa ? 0.86 : 1) * (bloqueadores === 6 ? 1.07 : bloqueadores === 7 ? 0.95 : 1)
  const yardas = (pa ? 2.4 : 0) + (rollout ? -0.3 : 0) + (bloqueadores === 6 ? 0 : bloqueadores === 7 ? -0.3 : 0)
  return {
    presion_actual_pct: 42,
    presion_esperada_pct: Math.round(42 * multiplicador),
    yardas_delta: Math.round(yardas * 10) / 10,
  }
}

/** Sack de Garrett a los 2.4 s: el QB retrocede, la estrella (E) entra por la izquierda del QB. */
function repeticion(): Repeticion {
  const inicio = [
    { rol: 'Q' as const, x: 0, y: 0 },
    { rol: 'B' as const, x: 3.3, y: 3.2 },
    { rol: 'B' as const, x: 3.6, y: 1.5 },
    { rol: 'B' as const, x: 3.9, y: -1.7 },
    { rol: 'B' as const, x: 4.2, y: -0.1 },
    { rol: 'R' as const, x: 5.4, y: -5.7 },
    { rol: 'R' as const, x: 5.4, y: -3.1 },
    { rol: 'R' as const, x: 5.5, y: 2.7 },
    { rol: 'E' as const, x: 5.2, y: 6.3 },
  ]
  const fin = [
    { rol: 'Q' as const, x: -4.5, y: -0.3 },
    { rol: 'B' as const, x: -3.6, y: 2.2 },
    { rol: 'B' as const, x: -2.3, y: -1.5 },
    { rol: 'B' as const, x: -0.4, y: -1.0 },
    { rol: 'B' as const, x: 0.9, y: 1.7 },
    { rol: 'R' as const, x: -3.2, y: -1.7 },
    { rol: 'R' as const, x: 0.4, y: -1.4 },
    { rol: 'R' as const, x: 1.9, y: 2.1 },
    { rol: 'E' as const, x: -4.0, y: 1.3 },
  ]
  const total = 18
  const frames = Array.from({ length: total }, (_, i) => {
    const t = i / (total - 1)
    return inicio.map((p, j) => ({
      rol: p.rol,
      x: Math.round((p.x + (fin[j].x - p.x) * t) * 100) / 100,
      y: Math.round((p.y + (fin[j].y - p.y) * t) * 100) / 100,
    }))
  })
  return {
    descripcion: 'KC vs CLE · Semana 1 · 3º y 10 · Myles Garrett llega a 2.4 s · sack',
    reloj_s: 2.4,
    fin_s: 3.5,
    frames,
  }
}

export function responderMock<T>(ruta: string, params: Record<string, string | number>): Promise<T> {
  const dato = (() => {
    switch (ruta) {
      case 'opciones':
        return opciones
      case 'partido':
        return partido
      case 'situacion':
        return situaciones[(params.sit as Sit) ?? 'a']
      case 'escenario':
        return escenario(Number(params.pa) as 0 | 1, Number(params.rollout) as 0 | 1, Number(params.bloqueadores) as 5 | 6 | 7)
      case 'estrella':
        return estrella
      case 'repeticion':
        return repeticion()
      default:
        throw new Error(`mock.ts no conoce la ruta api/${ruta}`)
    }
  })()
  // Pequeña espera para ver los estados de carga reales de la interfaz.
  return new Promise((resolver) => setTimeout(() => resolver(dato as T), 120))
}
