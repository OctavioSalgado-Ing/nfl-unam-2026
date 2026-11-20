/**
 * Cliente de la API. Único lugar donde se decide si los datos vienen del backend real o de mock.ts.
 *
 * Las rutas van SIN diagonal inicial (`api/...`): la app se publica en una subruta y con `/api`
 * las llamadas darían 404. Nunca uses localhost ni URLs absolutas aquí.
 */
import type { Escenario, Estrella, Opciones, Partido, Repeticion, Sit, Situacion } from './types'
import { responderMock } from './mock'

/** false = backend real (api/...). true = datos de mock.ts, para trabajar sin backend. */
export const USE_MOCK = false

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorApi'
  }
}

const MENSAJE_POR_ESTADO: Record<number, string> = {
  400: 'La consulta no es válida.',
  404: 'Ese equipo no está en los datos.',
  500: 'El servidor no pudo calcular esta respuesta.',
  503: 'El servidor todavía está cargando los datos.',
}

/** FastAPI responde { detail: string } o { detail: [{ msg, loc }] }. */
function leerDetalle(cuerpo: unknown, estado: number): string {
  const detalle = (cuerpo as { detail?: unknown } | null)?.detail
  if (typeof detalle === 'string' && detalle.trim() !== '') return detalle
  if (Array.isArray(detalle)) {
    const msg = detalle
      .map((d) => (typeof d === 'object' && d !== null ? String((d as { msg?: unknown }).msg ?? '') : ''))
      .filter(Boolean)
      .join('. ')
    if (msg) return msg
  }
  return MENSAJE_POR_ESTADO[estado] ?? `El servidor respondió ${estado}.`
}

function consulta(params: Record<string, string | number>): string {
  const busqueda = new URLSearchParams()
  for (const [clave, valor] of Object.entries(params)) busqueda.set(clave, String(valor))
  const texto = busqueda.toString()
  return texto ? `?${texto}` : ''
}

async function pedir<T>(ruta: string, params: Record<string, string | number>, senal?: AbortSignal): Promise<T> {
  if (USE_MOCK) return responderMock<T>(ruta, params)

  let respuesta: Response
  try {
    respuesta = await fetch(`api/${ruta}${consulta(params)}`, {
      signal: senal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ErrorApi(0, 'Sin conexión con el servidor. Revisa que el backend esté corriendo.')
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null)
    throw new ErrorApi(respuesta.status, leerDetalle(cuerpo, respuesta.status))
  }

  try {
    return (await respuesta.json()) as T
  } catch {
    throw new ErrorApi(respuesta.status, 'El servidor respondió algo que no es JSON.')
  }
}

export const api = {
  opciones: (senal?: AbortSignal) => pedir<Opciones>('opciones', {}, senal),

  partido: (ofensiva: string, rival: string, senal?: AbortSignal) =>
    pedir<Partido>('partido', { ofensiva, rival }, senal),

  situacion: (rival: string, sit: Sit, senal?: AbortSignal) =>
    pedir<Situacion>('situacion', { rival, sit }, senal),

  escenario: (rival: string, pa: 0 | 1, rollout: 0 | 1, bloqueadores: 5 | 6 | 7, senal?: AbortSignal) =>
    pedir<Escenario>('escenario', { rival, pa, rollout, bloqueadores }, senal),

  estrella: (rival: string, senal?: AbortSignal) => pedir<Estrella>('estrella', { rival }, senal),

  repeticion: (rival: string, senal?: AbortSignal) => pedir<Repeticion>('repeticion', { rival }, senal),
}
