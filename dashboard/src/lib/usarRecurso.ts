/**
 * Un recurso de la API con sus tres estados: cargando, error (con reintento) y dato.
 * Cancela la petición anterior al cambiar de equipo o al desmontar.
 */
import { useCallback, useEffect, useState } from 'react'
import { ErrorApi } from '../api/client'

export interface Recurso<T> {
  datos: T | null
  cargando: boolean
  error: string | null
  estado: number | null
  reintentar: () => void
}

export function usarRecurso<T>(
  pedir: (senal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  activo = true,
): Recurso<T> {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(activo)
  const [error, setError] = useState<string | null>(null)
  const [estado, setEstado] = useState<number | null>(null)
  const [intento, setIntento] = useState(0)

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  useEffect(() => {
    if (!activo) return
    const control = new AbortController()
    let vigente = true
    setCargando(true)
    setError(null)
    setEstado(null)

    pedir(control.signal)
      .then((resultado) => {
        if (!vigente) return
        setDatos(resultado)
        setCargando(false)
      })
      .catch((e: unknown) => {
        if (!vigente || (e instanceof DOMException && e.name === 'AbortError')) return
        setDatos(null)
        setError(e instanceof Error ? e.message : 'No se pudo cargar la información.')
        setEstado(e instanceof ErrorApi ? e.estado : null)
        setCargando(false)
      })

    return () => {
      vigente = false
      control.abort()
    }
    // pedir se recrea en cada render: las dependencias reales las declara quien llama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intento, activo])

  return { datos, cargando, error, estado, reintentar }
}
