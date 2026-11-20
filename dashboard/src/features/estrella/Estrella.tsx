/**
 * Pestaña Sin su estrella: qué cambia cuando la amenaza #1 está en el campo y cuando no.
 * Si un grupo tiene menos de 20 jugadas (o nunca llega al 15% de presión), el backend manda null
 * y aquí se dice que no hay dato, sin inventar un número.
 */
import { useState } from 'react'
import { api } from '../../api/client'
import type { Estrella as DatosEstrella, GrupoEstrella } from '../../api/types'
import { Esqueleto } from '../../components/ui/Esqueleto'
import { EstadoError } from '../../components/ui/EstadoError'
import { Segmentado } from '../../components/ui/Segmentado'
import { apellido, fmtJugadas, fmtPorcentaje, fmtSegundos, SIN_DATO } from '../../lib/format'
import { usarRecurso } from '../../lib/usarRecurso'

interface Props {
  rival: string
}

type Modo = 'con' | 'sin'

export function Estrella({ rival }: Props) {
  const [modo, setModo] = useState<Modo>('con')
  const { datos, error, estado, reintentar } = usarRecurso<DatosEstrella>(
    (senal) => api.estrella(rival, senal),
    [rival],
  )

  if (error) return <EstadoError mensaje={error} estado={estado} onReintentar={reintentar} />

  if (!datos) {
    return (
      <div role="status" aria-label="Cargando la estrella" className="panel flex flex-col gap-4 p-6">
        <Esqueleto className="h-4 w-40" />
        <Esqueleto className="h-24 w-56" />
        <Esqueleto className="h-4 w-48" />
      </div>
    )
  }

  const corto = apellido(datos.nombre)
  const grupo: GrupoEstrella | null = datos[modo]
  const otro: GrupoEstrella | null = datos[modo === 'con' ? 'sin' : 'con']

  const diferencia =
    datos.con && datos.sin ? datos.con.presion_pct - datos.sin.presion_pct : null

  return (
    <div className="flex flex-col gap-6">
      <Segmentado
        etiqueta={`Jugadas con y sin ${corto}`}
        opciones={[
          { valor: 'con' as Modo, etiqueta: `Con ${corto}` },
          { valor: 'sin' as Modo, etiqueta: `Sin ${corto}` },
        ]}
        actual={modo}
        onCambio={setModo}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel flex flex-col gap-4 p-6" aria-live="polite">
          <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">
            {modo === 'con' ? `Con ${corto} en el campo` : `Sin ${corto} en el campo`}
          </h2>

          {grupo ? (
            <>
              <div className="flex flex-wrap items-end gap-8">
                <div>
                  <p className="etiqueta">Tiempo seguro</p>
                  <p className="flex items-baseline gap-1">
                    <span className="text-cifra-sm tabular-nums">{fmtSegundos(grupo.tiempo_seguro_s)}</span>
                    <span className="text-xl font-semibold">s</span>
                  </p>
                </div>
                <div>
                  <p className="etiqueta">Presión</p>
                  <p className="text-4xl font-semibold tabular-nums">{fmtPorcentaje(grupo.presion_pct)}</p>
                </div>
              </div>
              <p className="border-t border-linea pt-4 text-sm text-apagado">
                Calculado con {fmtJugadas(grupo.n)} de pase del rival.
              </p>
            </>
          ) : (
            <>
              <p className="text-cifra-sm tabular-nums text-apagado">{SIN_DATO}</p>
              <p className="max-w-[60ch] text-sm text-apagado text-pretty">
                No hay suficientes jugadas de este grupo para calcularlo (hacen falta 20 jugadas y que su presión
                llegue al 15%). No lo estimamos con otros datos.
              </p>
            </>
          )}
        </div>

        <div className="panel flex flex-col gap-3 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">Qué cambia</h2>
          {diferencia !== null && datos.con && datos.sin ? (
            <>
              <p className="text-2xl font-semibold leading-snug text-balance">
                {diferencia > 0
                  ? `Con ${corto} presionan ${fmtPorcentaje(diferencia)} más`
                  : diferencia < 0
                    ? `Sin ${corto} presionan ${fmtPorcentaje(-diferencia)} más`
                    : `${corto} no cambia su presión`}
              </p>
              <dl className="mt-1 grid grid-cols-2 gap-4 border-t border-linea pt-4 text-sm">
                <div>
                  <dt className="text-apagado">Con {corto}</dt>
                  <dd className="tabular-nums">
                    {fmtSegundos(datos.con.tiempo_seguro_s)} s · {fmtPorcentaje(datos.con.presion_pct)}
                  </dd>
                </div>
                <div>
                  <dt className="text-apagado">Sin {corto}</dt>
                  <dd className="tabular-nums">
                    {fmtSegundos(datos.sin.tiempo_seguro_s)} s · {fmtPorcentaje(datos.sin.presion_pct)}
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-apagado text-pretty">
                Se asocia con su presencia en el campo; no es una relación de causa.
              </p>
            </>
          ) : (
            <p className="max-w-[60ch] text-sm text-apagado text-pretty">
              Solo tenemos datos del grupo {otro ? (modo === 'con' ? 'con' : 'sin') : 'contrario'}: no se puede comparar
              con y sin {corto}.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
