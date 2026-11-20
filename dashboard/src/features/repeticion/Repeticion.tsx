/**
 * Pestaña Repetición: una jugada real del rival en la que la amenaza #1 llegó al QB.
 *
 * El círculo alrededor del QB son las 2 yardas de la definición de presión: cuando un rusher lo toca,
 * eso es la presión. Pasa de verde a ámbar y a rojo al acercarse el reloj.
 * La animación escribe atributos por ref dentro de un rAF: no hay un setState por frame.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { Repeticion as DatosRepeticion, Rol } from '../../api/types'
import { Esqueleto } from '../../components/ui/Esqueleto'
import { EstadoError } from '../../components/ui/EstadoError'
import { fmtSegundos } from '../../lib/format'
import { COLOR } from '../../lib/nivel'
import { usarRecurso } from '../../lib/usarRecurso'

interface Props {
  rival: string
}

const UNID = 20          // unidades de SVG por yarda
const PASO_S = 0.2       // el backend manda uno de cada 2 frames: 0.2 s entre frames
const RADIO_PRESION = 2  // yardas de la definición de presión
const MARGEN = 2         // yardas de aire alrededor de la jugada

const ESTILO: Record<Rol, { r: number; fill: string; stroke: string; ancho: number }> = {
  Q: { r: 8, fill: COLOR.tinta, stroke: COLOR.tinta, ancho: 0 },
  B: { r: 7, fill: COLOR.superficie, stroke: COLOR.apagado, ancho: 2 },
  R: { r: 7, fill: COLOR.apagado, stroke: COLOR.apagado, ancho: 0 },
  E: { r: 8, fill: COLOR.rojo, stroke: COLOR.rojo, ancho: 2 },
}

export function Repeticion({ rival }: Props) {
  const { datos, error, estado, reintentar } = usarRecurso<DatosRepeticion>(
    (senal) => api.repeticion(rival, senal),
    [rival],
  )

  if (error) return <EstadoError mensaje={error} estado={estado} onReintentar={reintentar} />
  if (!datos) {
    return (
      <div role="status" aria-label="Cargando la repetición" className="panel flex flex-col gap-4 p-6">
        <Esqueleto className="h-4 w-72" />
        <Esqueleto className="h-[320px] w-full" />
      </div>
    )
  }
  if (datos.frames.length === 0 || datos.frames[0].length === 0) {
    return (
      <div className="panel p-6">
        <p className="text-base">{datos.descripcion}</p>
        <p className="mt-2 text-sm text-apagado">No hay posiciones para dibujar esta jugada.</p>
      </div>
    )
  }
  return <Jugada key={rival} datos={datos} />
}

function Jugada({ datos }: { datos: DatosRepeticion }) {
  const { frames, reloj_s, fin_s, descripcion } = datos
  const [corriendo, setCorriendo] = useState(false)
  const jugadores = useRef<(SVGGElement | null)[]>([])
  const anillo = useRef<SVGCircleElement | null>(null)
  const reloj = useRef<HTMLSpanElement | null>(null)
  const animacion = useRef<number | null>(null)

  const vista = useMemo(() => {
    const xs = frames.flatMap((f) => f.map((p) => p.x)).concat(0)
    const ys = frames.flatMap((f) => f.map((p) => p.y)).concat(0)
    const minX = Math.min(...xs) - MARGEN
    const maxX = Math.max(...xs) + MARGEN
    const minY = Math.min(...ys) - MARGEN
    const maxY = Math.max(...ys) + MARGEN
    return {
      minX,
      maxY,
      ancho: (maxX - minX) * UNID,
      alto: (maxY - minY) * UNID,
      px: (x: number) => (x - minX) * UNID,
      py: (y: number) => (maxY - y) * UNID,
    }
  }, [frames])

  /** Posición de cada jugador en el segundo t, interpolada entre los dos frames vecinos. */
  const colocar = useCallback(
    (t: number) => {
      const exacto = Math.min(t / PASO_S, frames.length - 1)
      const i = Math.floor(exacto)
      const j = Math.min(i + 1, frames.length - 1)
      const mezcla = exacto - i
      const desde = frames[i]
      const hasta = frames[j]

      desde.forEach((p, indice) => {
        const g = jugadores.current[indice]
        if (!g) return
        const q = hasta[indice] ?? p
        const x = vista.px(p.x + (q.x - p.x) * mezcla)
        const y = vista.py(p.y + (q.y - p.y) * mezcla)
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
        if (p.rol === 'Q' && anillo.current) {
          anillo.current.setAttribute('cx', x.toFixed(1))
          anillo.current.setAttribute('cy', y.toFixed(1))
          const color = t >= reloj_s ? COLOR.rojo : t >= reloj_s - 0.6 ? COLOR.ambar : COLOR.verde
          anillo.current.setAttribute('stroke', color)
          anillo.current.setAttribute('stroke-width', t >= reloj_s ? '3' : '2')
        }
      })
      if (reloj.current) reloj.current.textContent = fmtSegundos(t)
    },
    [frames, reloj_s, vista],
  )

  // Posición inicial (y al cambiar de jugada).
  useEffect(() => {
    colocar(0)
  }, [colocar])

  const detener = () => {
    if (animacion.current !== null) cancelAnimationFrame(animacion.current)
    animacion.current = null
  }

  useEffect(() => detener, [])

  const ver = () => {
    detener()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      // Sin movimiento: se salta al instante de la presión, que es lo que hay que ver.
      colocar(reloj_s)
      setCorriendo(false)
      return
    }
    const inicio = performance.now()
    setCorriendo(true)
    const paso = (ahora: number) => {
      const t = (ahora - inicio) / 1000
      if (t >= fin_s) {
        colocar(fin_s)
        setCorriendo(false)
        animacion.current = null
        return
      }
      colocar(t)
      animacion.current = requestAnimationFrame(paso)
    }
    animacion.current = requestAnimationFrame(paso)
  }

  const primero = frames[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">Una jugada real</h2>
          <p className="mt-1 max-w-[65ch] text-base text-pretty">{descripcion}</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="flex items-baseline gap-1">
            <span ref={reloj} className="text-4xl font-semibold tabular-nums">
              0.0
            </span>
            <span className="text-lg font-semibold">s</span>
          </p>
          <button type="button" onClick={ver} className="boton" aria-live="off">
            {corriendo ? 'Reiniciar' : 'Ver jugada'}
          </button>
        </div>
      </div>

      <div className="panel p-4">
        <svg
          viewBox={`0 0 ${vista.ancho} ${vista.alto}`}
          className="mx-auto w-full max-w-[560px]"
          role="img"
          aria-label={`Repetición: ${descripcion}. La presión llega a los ${fmtSegundos(reloj_s)} segundos y la jugada termina a los ${fmtSegundos(fin_s)}.`}
        >
          {/* Líneas de yarda cada 5 yd como referencia de distancia. */}
          {Array.from({ length: Math.ceil(vista.ancho / (5 * UNID)) + 1 }, (_, i) => i * 5 * UNID).map((x) => (
            <line key={x} x1={x} x2={x} y1="0" y2={vista.alto} stroke={COLOR.linea} strokeWidth="1" />
          ))}

          {/* Las 2 yardas de la definición de presión, alrededor del QB. */}
          <circle
            ref={anillo}
            r={RADIO_PRESION * UNID}
            fill="none"
            stroke={COLOR.verde}
            strokeWidth="2"
            strokeDasharray="6 5"
          />

          {primero.map((p, i) => {
            const e = ESTILO[p.rol]
            return (
              <g
                key={i}
                ref={(el) => {
                  jugadores.current[i] = el
                }}
              >
                <circle r={e.r} fill={e.fill} stroke={e.stroke} strokeWidth={e.ancho} />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-apagado">
        <Leyenda color={COLOR.tinta} texto="QB" relleno />
        <Leyenda color={COLOR.apagado} texto="Bloqueadores" />
        <Leyenda color={COLOR.apagado} texto="Rushers" relleno />
        <Leyenda color={COLOR.rojo} texto="La estrella" relleno />
        <span className="tabular-nums">
          Presión a los {fmtSegundos(reloj_s)} s · fin a los {fmtSegundos(fin_s)} s
        </span>
      </div>
    </div>
  )
}

function Leyenda({ color, texto, relleno }: { color: string; texto: string; relleno?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill={relleno ? color : 'none'} stroke={color} strokeWidth="2" />
      </svg>
      {texto}
    </span>
  )
}
