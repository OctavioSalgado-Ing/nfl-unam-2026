/**
 * Pestaña Situación: 4 botones (1º y 2º, 3º corto, 3º medio, 3º largo) y qué hacer en cada una.
 * Las 4 se piden juntas para poder compararlas; cada una cuesta milisegundos en el backend.
 */
import { lazy, Suspense, useState } from 'react'
import { api } from '../../api/client'
import type { Sit, Situacion as DatosSituacion } from '../../api/types'
import { Esqueleto } from '../../components/ui/Esqueleto'
import { EstadoError } from '../../components/ui/EstadoError'
import { EtiquetaLiga } from '../../components/ui/EtiquetaLiga'
import { Segmentado } from '../../components/ui/Segmentado'
import { DETALLE_SIT, ETIQUETA_SIT, fmtPorcentaje } from '../../lib/format'
import { CLASE_TEXTO, TEXTO_NIVEL } from '../../lib/nivel'
import { usarRecurso } from '../../lib/usarRecurso'

interface Props {
  rival: string
}

const ORDEN: Sit[] = ['a', 'c', 'm', 'l']
const OPCIONES = ORDEN.map((s) => ({ valor: s, etiqueta: ETIQUETA_SIT[s] }))

// Recharts solo se descarga al abrir esta pestaña: no pesa en la primera carga de Partido.
const BarrasSituaciones = lazy(() =>
  import('../../components/charts/BarrasSituaciones').then((m) => ({ default: m.BarrasSituaciones })),
)

export function Situacion({ rival }: Props) {
  const [sit, setSit] = useState<Sit>('l')

  const { datos, cargando, error, estado, reintentar } = usarRecurso<Record<Sit, DatosSituacion>>(
    async (senal) => {
      const todas = await Promise.all(ORDEN.map((s) => api.situacion(rival, s, senal)))
      return Object.fromEntries(ORDEN.map((s, i) => [s, todas[i]])) as Record<Sit, DatosSituacion>
    },
    [rival],
  )

  if (error) return <EstadoError mensaje={error} estado={estado} onReintentar={reintentar} />

  const actual = datos?.[sit] ?? null

  return (
    <div className="flex flex-col gap-6">
      <Segmentado etiqueta="Situación del partido" opciones={OPCIONES} actual={sit} onCambio={setSit} columnas />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel flex flex-col gap-4 p-6" aria-live="polite" aria-busy={cargando}>
          {!actual ? (
            <div role="status" aria-label="Cargando la situación" className="flex flex-col gap-4">
              <Esqueleto className="h-4 w-40" />
              <Esqueleto className="h-24 w-36" />
              <Esqueleto className="h-4 w-48" />
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">
                  Presión en {DETALLE_SIT[sit].toLowerCase()}
                </h2>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className={`text-cifra-sm tabular-nums sm:text-cifra ${CLASE_TEXTO[actual.nivel]}`}>
                    {fmtPorcentaje(actual.presion_pct).replace('%', '')}
                  </span>
                  <span className={`text-2xl font-semibold ${CLASE_TEXTO[actual.nivel]}`}>%</span>
                </p>
                <p className={`mt-2 text-sm font-medium ${CLASE_TEXTO[actual.nivel]}`}>
                  {TEXTO_NIVEL[actual.nivel]} · liga{' '}
                  <span className="tabular-nums">{fmtPorcentaje(actual.presion_liga_pct)}</span>
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-4 border-t border-linea pt-4 text-sm">
                <div>
                  <dt className="text-apagado">Blitz del rival</dt>
                  <dd className="text-lg font-semibold tabular-nums">{fmtPorcentaje(actual.blitz_pct)}</dd>
                </div>
                <div>
                  <dt className="text-apagado">Blitz de la liga</dt>
                  <dd className="text-lg font-semibold tabular-nums text-apagado">
                    {fmtPorcentaje(actual.blitz_liga_pct)}
                  </dd>
                </div>
              </dl>

              {actual.fuente === 'liga' && <EtiquetaLiga />}
            </>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className={`panel flex flex-col gap-2 p-6 ${actual ? '' : 'min-h-[132px]'}`}>
            <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">Qué hacer</h2>
            {actual ? (
              <>
                <p className="text-2xl font-semibold leading-snug text-balance">{actual.accion}</p>
                <p className="text-base text-apagado text-pretty">{actual.detalle}</p>
              </>
            ) : (
              <Esqueleto className="h-8 w-3/4" />
            )}
          </div>

          <div className="panel p-6">
            {datos ? (
              <Suspense fallback={<Esqueleto className="h-[190px] w-full" />}>
                <BarrasSituaciones datos={datos} actual={sit} />
              </Suspense>
            ) : (
              <Esqueleto className="h-[190px] w-full" />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
