/** Pestañas accesibles: flechas para moverse, Home/End a los extremos. Sin animación (uso constante). */
import { useRef } from 'react'

export interface Pestana<T extends string> {
  id: T
  etiqueta: string
}

interface Props<T extends string> {
  pestanas: readonly Pestana<T>[]
  actual: T
  onCambio: (id: T) => void
}

export function Pestanas<T extends string>({ pestanas, actual, onCambio }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const mover = (indice: number, salto: number) => {
    const destino = (indice + salto + pestanas.length) % pestanas.length
    onCambio(pestanas[destino].id)
    refs.current[destino]?.focus()
  }

  return (
    <div role="tablist" aria-label="Vistas de la hoja de protección" className="flex flex-wrap gap-1">
      {pestanas.map((p, i) => {
        const activa = p.id === actual
        return (
          <button
            key={p.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            id={`pestana-${p.id}`}
            aria-selected={activa}
            aria-controls={`panel-${p.id}`}
            tabIndex={activa ? 0 : -1}
            onClick={() => onCambio(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') mover(i, 1)
              else if (e.key === 'ArrowLeft') mover(i, -1)
              else if (e.key === 'Home') mover(i, -i)
              else if (e.key === 'End') mover(i, pestanas.length - 1 - i)
              else return
              e.preventDefault()
            }}
            className={`min-h-[44px] rounded px-3 text-sm font-medium transition-colors duration-150 ${
              activa
                ? 'bg-elevado text-tinta shadow-[inset_0_-2px_0_0_rgb(var(--accent))]'
                : 'text-apagado hover:text-tinta'
            }`}
          >
            {p.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
