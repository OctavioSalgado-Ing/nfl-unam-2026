/** Semáforo del producto: un nivel, un color, un texto. El color nunca va solo. */
import type { Nivel } from '../api/types'

export const TEXTO_NIVEL: Record<Nivel, string> = {
  rojo: 'Riesgo alto',
  amarillo: 'Riesgo medio',
  verde: 'Riesgo bajo',
}

export const CLASE_TEXTO: Record<Nivel, string> = {
  rojo: 'text-rojo',
  amarillo: 'text-ambar',
  verde: 'text-verde',
}

export const CLASE_BORDE: Record<Nivel, string> = {
  rojo: 'border-rojo',
  amarillo: 'border-ambar',
  verde: 'border-verde',
}

/** Para SVG y props de Recharts, que necesitan un color, no una clase. */
export const COLOR_NIVEL: Record<Nivel, string> = {
  rojo: 'rgb(var(--danger))',
  amarillo: 'rgb(var(--warn))',
  verde: 'rgb(var(--ok))',
}

export const COLOR = {
  acento: 'rgb(var(--accent))',
  tinta: 'rgb(var(--ink))',
  apagado: 'rgb(var(--muted))',
  linea: 'rgb(var(--line))',
  superficie: 'rgb(var(--surface))',
  elevado: 'rgb(var(--raised))',
  rojo: 'rgb(var(--danger))',
  ambar: 'rgb(var(--warn))',
  verde: 'rgb(var(--ok))',
}

/** Mismo criterio que el backend para la pestaña Situación: 8 puntos arriba/abajo de la liga. */
export function nivelPorPresion(pct: number, ligaPct: number): Nivel {
  if (pct >= ligaPct + 8) return 'rojo'
  if (pct <= ligaPct - 8) return 'verde'
  return 'amarillo'
}
