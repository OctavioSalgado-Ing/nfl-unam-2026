/** Pastilla de contexto: un dato del rival contra el de la liga. */
import { fmtPorcentaje } from '../../lib/format'

interface Props {
  etiqueta: string
  rival: number
  liga: number
}

export function Pastilla({ etiqueta, rival, liga }: Props) {
  const diferencia = rival - liga
  const color = diferencia >= 8 ? 'text-rojo' : diferencia <= -8 ? 'text-verde' : 'text-tinta'
  return (
    <div className="flex items-baseline gap-2 rounded border border-linea bg-superficie px-3 py-2">
      <span className="text-sm text-apagado">{etiqueta}</span>
      <span className={`text-lg font-semibold tabular-nums ${color}`}>{fmtPorcentaje(rival)}</span>
      <span className="text-sm text-apagado tabular-nums">liga {fmtPorcentaje(liga)}</span>
    </div>
  )
}
