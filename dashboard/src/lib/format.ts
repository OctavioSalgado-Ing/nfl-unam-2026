/** Formato de números y textos. Un solo lugar, locale constante. */
import type { Lado, Sit } from '../api/types'

export const LOCALE = 'es-MX'

const nf = (digitos: number) =>
  new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digitos, maximumFractionDigits: digitos })

/** 2.4 -> "2.4" (siempre con 1 decimal, como el contrato). */
export const fmtSegundos = (n: number): string => nf(1).format(n)

/** 42 -> "42%" (el backend ya manda enteros de 0 a 100). */
export const fmtPorcentaje = (n: number): string => `${nf(0).format(Math.round(n))}%`

/** 18.2 -> "18.2%" para valores que el contrato manda con decimal. */
export const fmtPorcentajeDecimal = (n: number): string => `${nf(1).format(n)}%`

/** 0.2 -> "+0.2", -0.2 -> "−0.2" (menos tipográfico, no guion). */
export const fmtConSigno = (n: number): string => {
  const valor = nf(1).format(Math.abs(n))
  if (Math.abs(n) < 0.05) return `±${valor}`
  return `${n > 0 ? '+' : '−'}${valor}`
}

/** Valor ausente: nunca NaN, null ni undefined en pantalla. */
export const SIN_DATO = '—'

export const fmtSegundosOpc = (n: number | null | undefined): string =>
  n === null || n === undefined || Number.isNaN(n) ? SIN_DATO : fmtSegundos(n)

export const fmtPorcentajeOpc = (n: number | null | undefined): string =>
  n === null || n === undefined || Number.isNaN(n) ? SIN_DATO : fmtPorcentaje(n)

export const fmtPorcentajeDecimalOpc = (n: number | null | undefined): string =>
  n === null || n === undefined || Number.isNaN(n) ? SIN_DATO : fmtPorcentajeDecimal(n)

/** "Myles Garrett" -> "Garrett". Para los rótulos del campo, donde el espacio es poco. */
export const apellido = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/)
  return partes.length > 1 ? partes.slice(1).join(' ') : nombre
}

/** "1 jugada" / "208 jugadas" */
const plural = new Intl.PluralRules(LOCALE)
export const fmtJugadas = (n: number): string =>
  `${nf(0).format(n)} ${plural.select(n) === 'one' ? 'jugada' : 'jugadas'}`

export const ETIQUETA_SIT: Record<Sit, string> = {
  a: '1º y 2º',
  c: '3º corto',
  m: '3º medio',
  l: '3º largo',
}

export const DETALLE_SIT: Record<Sit, string> = {
  a: '1º y 2º down',
  c: '3º con 1 a 3 yardas',
  m: '3º con 4 a 6 yardas',
  l: '3º o 4º con 7 o más',
}

export const ETIQUETA_LADO: Record<Lado, string> = {
  izquierda: 'Izquierda',
  centro: 'Centro',
  derecha: 'Derecha',
}

/** "por tu izquierda" / "por el centro", como lo diría el coach. */
export const porLado = (lado: Lado): string => (lado === 'centro' ? 'por el centro' : `por tu ${lado}`)
