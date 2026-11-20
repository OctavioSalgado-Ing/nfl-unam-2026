/**
 * Mini campo visto desde atrás del ataque: el QB y las 3 vías de presión.
 * Gesto distintivo: solo la línea del lado más peligroso va en rojo; todo lo demás es neutro.
 * El grosor de cada línea sigue su porcentaje, así que el color no es el único código.
 */
import type { Amenaza, Lado, Lados } from '../../api/types'
import { apellido, fmtPorcentaje, fmtPorcentajeDecimalOpc } from '../../lib/format'
import { COLOR } from '../../lib/nivel'

interface Props {
  lados: Lados
  amenaza: Amenaza
}

const ANCHO = 320
const ALTO = 210
const QB = { x: 160, y: 158 }

/** Origen de cada vía, en la vista del QB: su izquierda queda a la izquierda de la pantalla. */
const ORIGEN: Record<Lado, { x: number; y: number }> = {
  izquierda: { x: 34, y: 38 },
  centro: { x: 160, y: 24 },
  derecha: { x: 286, y: 38 },
}

const ORDEN: Lado[] = ['izquierda', 'centro', 'derecha']

export function CampoMini({ lados, amenaza }: Props) {
  const peligroso = ORDEN.reduce((a, b) => (lados[b] > lados[a] ? b : a), ORDEN[0])

  return (
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full"
        role="img"
        aria-label={`Por dónde llega la presión: izquierda ${lados.izquierda}%, centro ${lados.centro}%, derecha ${lados.derecha}%. El lado más peligroso es la ${peligroso}.`}
      >
        {/* Líneas de yarda: referencia tenue, sin imitar césped. */}
        {[52, 86, 120].map((y) => (
          <line key={y} x1="16" x2={ANCHO - 16} y1={y} y2={y} stroke={COLOR.linea} strokeWidth="1" />
        ))}
        {/* Línea de golpeo */}
        <line x1="16" x2={ANCHO - 16} y1="134" y2="134" stroke={COLOR.apagado} strokeWidth="1.5" strokeDasharray="5 4" />

        {ORDEN.map((lado) => {
          const esPeligroso = lado === peligroso
          const color = esPeligroso ? COLOR.rojo : COLOR.apagado
          const origen = ORIGEN[lado]
          const grosor = 2 + lados[lado] / 9
          // El trazo se detiene antes del QB para que la punta no lo tape.
          const dx = QB.x - origen.x
          const dy = QB.y - origen.y
          const largo = Math.hypot(dx, dy)
          const recorte = 26 / largo
          const finX = QB.x - dx * recorte
          const finY = QB.y - dy * recorte
          return (
            <g key={lado}>
              <line
                x1={origen.x}
                y1={origen.y}
                x2={finX}
                y2={finY}
                stroke={color}
                strokeWidth={grosor}
                strokeLinecap="round"
                opacity={esPeligroso ? 1 : 0.55}
              />
              {/* Punta de flecha hacia el QB */}
              <polygon
                points={`0,${-grosor - 2} ${grosor + 7},0 0,${grosor + 2}`}
                fill={color}
                opacity={esPeligroso ? 1 : 0.55}
                transform={`translate(${finX} ${finY}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`}
              />
              <text
                x={origen.x + (lado === 'izquierda' ? 6 : lado === 'derecha' ? -6 : 0)}
                y={origen.y - 10}
                textAnchor={lado === 'izquierda' ? 'start' : lado === 'derecha' ? 'end' : 'middle'}
                className="tabular-nums"
                fontSize="15"
                fontWeight="600"
                fill={esPeligroso ? COLOR.rojo : COLOR.apagado}
              >
                {fmtPorcentaje(lados[lado])}
              </text>
              {esPeligroso && (
                <text
                  x={origen.x + (lado === 'izquierda' ? 6 : lado === 'derecha' ? -6 : 0)}
                  y={origen.y + 8}
                  textAnchor={lado === 'izquierda' ? 'start' : lado === 'derecha' ? 'end' : 'middle'}
                  fontSize="12"
                  fill={COLOR.rojo}
                >
                  {apellido(amenaza.nombre)}
                </text>
              )}
            </g>
          )
        })}

        {/* QB */}
        <circle cx={QB.x} cy={QB.y} r="13" fill={COLOR.elevado} stroke={COLOR.tinta} strokeWidth="1.5" />
        <text
          x={QB.x}
          y={QB.y + 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={COLOR.tinta}
        >
          QB
        </text>
      </svg>

      <figcaption className="text-sm text-apagado text-pretty">
        {apellido(amenaza.nombre)} llega {amenaza.lado === 'centro' ? 'por el centro' : `por tu ${amenaza.lado}`} y gana{' '}
        <span className="tabular-nums text-tinta">{fmtPorcentajeDecimalOpc(amenaza.gana_pct)}</span> de sus duelos.
      </figcaption>
    </figure>
  )
}
