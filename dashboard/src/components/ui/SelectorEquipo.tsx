/** Select nativo: lo que el coach ya sabe usar, con teclado y en móvil. Label visible arriba. */
interface Props {
  id: string
  etiqueta: string
  valor: string
  equipos: string[]
  excluir?: string
  onCambio: (equipo: string) => void
  cargando?: boolean
}

export function SelectorEquipo({ id, etiqueta, valor, equipos, excluir, onCambio, cargando }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      <select
        id={id}
        value={valor}
        disabled={cargando || equipos.length === 0}
        onChange={(e) => onCambio(e.target.value)}
        className="boton min-w-[7.5rem] appearance-none bg-elevado px-3 font-semibold tabular-nums
                   disabled:opacity-60"
      >
        {equipos
          .filter((e) => e !== excluir)
          .map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
      </select>
    </div>
  )
}
