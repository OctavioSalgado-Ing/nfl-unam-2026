/** Qué falló y cómo salir de ahí. Un error en una pestaña no tumba el resto de la app. */
interface Props {
  mensaje: string
  estado?: number | null
  onReintentar: () => void
}

export function EstadoError({ mensaje, estado, onReintentar }: Props) {
  const titulo =
    estado === 404 ? 'No hay datos de ese equipo' : estado === 400 ? 'Esa consulta no es válida' : 'No se pudo cargar'
  return (
    <div role="alert" className="panel flex flex-col items-start gap-3 border-rojo p-6">
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--danger))" strokeWidth="2"
             strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </svg>
        <h3 className="text-base font-semibold">{titulo}</h3>
      </div>
      <p className="max-w-[65ch] text-sm text-apagado text-pretty">{mensaje}</p>
      <button type="button" onClick={onReintentar} className="boton">
        Reintentar
      </button>
    </div>
  )
}
