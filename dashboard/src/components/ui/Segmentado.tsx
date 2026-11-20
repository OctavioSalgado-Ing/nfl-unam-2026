/** Grupo de opciones excluyentes (play action sí/no, 5/6/7 bloqueadores). Un solo estilo de botón. */
export interface Opcion<T> {
  valor: T
  etiqueta: string
}

interface Props<T extends string | number> {
  etiqueta: string
  opciones: readonly Opcion<T>[]
  actual: T
  onCambio: (valor: T) => void
  columnas?: boolean
}

export function Segmentado<T extends string | number>({
  etiqueta,
  opciones,
  actual,
  onCambio,
  columnas,
}: Props<T>) {
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-col gap-2">
      <span className="etiqueta">{etiqueta}</span>
      <div className={columnas ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'flex flex-wrap gap-2'}>
        {opciones.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            aria-pressed={o.valor === actual}
            onClick={() => onCambio(o.valor)}
            className="boton active:scale-[0.97] transition-transform duration-150 ease-salida"
          >
            {o.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}
