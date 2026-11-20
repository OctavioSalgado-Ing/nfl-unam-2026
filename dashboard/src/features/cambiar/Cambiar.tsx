/**
 * Pestaña Cambiar jugada: tres ajustes y su efecto estimado en la presión y en las yardas.
 * El estimado sale de jugadas parecidas de toda la liga, y eso se dice en pantalla.
 */
import { useState } from 'react'
import { api } from '../../api/client'
import type { Escenario } from '../../api/types'
import { Esqueleto } from '../../components/ui/Esqueleto'
import { EstadoError } from '../../components/ui/EstadoError'
import { Segmentado } from '../../components/ui/Segmentado'
import { fmtConSigno, fmtPorcentaje } from '../../lib/format'
import { usarRecurso } from '../../lib/usarRecurso'

interface Props {
  rival: string
}

export function Cambiar({ rival }: Props) {
  const [pa, setPa] = useState<0 | 1>(0)
  const [rollout, setRollout] = useState<0 | 1>(0)
  const [bloqueadores, setBloqueadores] = useState<5 | 6 | 7>(5)

  const { datos, error, estado, reintentar } = usarRecurso<Escenario>(
    (senal) => api.escenario(rival, pa, rollout, bloqueadores, senal),
    [rival, pa, rollout, bloqueadores],
  )

  if (error) return <EstadoError mensaje={error} estado={estado} onReintentar={reintentar} />

  const sinCambios = pa === 0 && rollout === 0 && bloqueadores === 5
  const diferencia = datos ? datos.presion_esperada_pct - datos.presion_actual_pct : 0

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-5 sm:grid-cols-3">
        <Segmentado
          etiqueta="Play action"
          opciones={[
            { valor: 0 as const, etiqueta: 'No' },
            { valor: 1 as const, etiqueta: 'Sí' },
          ]}
          actual={pa}
          onCambio={setPa}
        />
        <Segmentado
          etiqueta="Mover al QB"
          opciones={[
            { valor: 0 as const, etiqueta: 'No' },
            { valor: 1 as const, etiqueta: 'Rollout' },
          ]}
          actual={rollout}
          onCambio={setRollout}
        />
        <Segmentado
          etiqueta="Bloqueadores"
          opciones={[
            { valor: 5 as const, etiqueta: '5' },
            { valor: 6 as const, etiqueta: '6' },
            { valor: 7 as const, etiqueta: '7' },
          ]}
          actual={bloqueadores}
          onCambio={setBloqueadores}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel flex flex-col gap-4 p-6" aria-live="polite">
          <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">Presión esperada</h2>
          {datos ? (
            <>
              <div className="flex flex-wrap items-end gap-6">
                <p className="flex items-baseline gap-1">
                  <span
                    className={`text-cifra-sm tabular-nums ${
                      diferencia <= -5 ? 'text-verde' : diferencia >= 5 ? 'text-rojo' : 'text-tinta'
                    }`}
                  >
                    {fmtPorcentaje(datos.presion_esperada_pct).replace('%', '')}
                  </span>
                  <span className="text-2xl font-semibold">%</span>
                </p>
                <p className="text-sm text-apagado">
                  Ahora: <span className="tabular-nums text-tinta">{fmtPorcentaje(datos.presion_actual_pct)}</span>
                  {!sinCambios && (
                    <>
                      <br />
                      Cambio:{' '}
                      <span className={`tabular-nums ${diferencia < 0 ? 'text-verde' : diferencia > 0 ? 'text-rojo' : ''}`}>
                        {fmtConSigno(diferencia)} puntos
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="border-t border-linea pt-4">
                <p className="etiqueta">Yardas por jugada</p>
                <p
                  className={`text-3xl font-semibold tabular-nums ${
                    datos.yardas_delta > 0 ? 'text-verde' : datos.yardas_delta < 0 ? 'text-rojo' : ''
                  }`}
                >
                  {fmtConSigno(datos.yardas_delta)}
                </p>
              </div>
            </>
          ) : (
            <div role="status" aria-label="Calculando el escenario" className="flex flex-col gap-4">
              <Esqueleto className="h-24 w-36" />
              <Esqueleto className="h-10 w-28" />
            </div>
          )}
        </div>

        <div className="panel flex flex-col gap-3 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">Cómo leerlo</h2>
          <p className="max-w-[60ch] text-base text-pretty">
            {sinCambios
              ? 'Esta es la jugada base contra este rival: sin play action, sin mover al QB y con 5 bloqueadores.'
              : 'El estimado compara jugadas parecidas de toda la liga con y sin cada ajuste, y aplica ese efecto a la presión de este rival.'}
          </p>
          <p className="text-sm text-apagado text-pretty">
            Estimado con jugadas parecidas de la liga. Se asocia con el ajuste; no es una relación de causa. No incluye
            nada de lo que pasa después del lanzamiento.
          </p>
        </div>
      </section>
    </div>
  )
}
