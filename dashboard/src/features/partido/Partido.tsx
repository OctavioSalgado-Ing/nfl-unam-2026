/**
 * Pestaña Partido: en 5 segundos, cuánto tiempo tiene el QB, por dónde llega la presión y 3 acciones.
 * Es la vista que se imprime (@media print en styles/index.css).
 */
import { api } from '../../api/client'
import type { Partido as DatosPartido } from '../../api/types'
import { EstadoError } from '../../components/ui/EstadoError'
import { EsqueletoPartido } from '../../components/ui/Esqueleto'
import { Pastilla } from '../../components/ui/Pastilla'
import { apellido, fmtConSigno, fmtPorcentajeDecimal, fmtSegundos } from '../../lib/format'
import { CLASE_TEXTO, TEXTO_NIVEL } from '../../lib/nivel'
import { usarRecurso } from '../../lib/usarRecurso'
import { CampoMini } from './CampoMini'

interface Props {
  ofensiva: string
  rival: string
}

export function Partido({ ofensiva, rival }: Props) {
  const { datos, cargando, error, estado, reintentar } = usarRecurso<DatosPartido>(
    (senal) => api.partido(ofensiva, rival, senal),
    [ofensiva, rival],
  )

  if (cargando && !datos) return <EsqueletoPartido />
  if (error) return <EstadoError mensaje={error} estado={estado} onReintentar={reintentar} />
  if (!datos) return null

  const { qb, nivel, tiempo_seguro_s, tiempo_seguro_liga_s, amenaza, bloqueador, claves, contexto, lados } = datos
  const tarde = qb.diferencia_s > 0.05
  const aTiempo = Math.abs(qb.diferencia_s) <= 0.05

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Suelta el balón antes de */}
        <div className="panel flex flex-col justify-between gap-5 p-6">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">Suelta el balón antes de</h2>
            <p className="mt-1 flex items-baseline gap-2">
              <span className={`text-cifra-sm tabular-nums sm:text-cifra ${CLASE_TEXTO[nivel]}`}>
                {fmtSegundos(tiempo_seguro_s)}
              </span>
              <span className={`text-2xl font-semibold ${CLASE_TEXTO[nivel]}`}>s</span>
            </p>
            <p className={`mt-2 text-sm font-medium ${CLASE_TEXTO[nivel]}`}>
              {TEXTO_NIVEL[nivel]} · liga <span className="tabular-nums">{fmtSegundos(tiempo_seguro_liga_s)} s</span>
            </p>
          </div>

          <dl className="flex flex-col gap-1 border-t border-linea pt-4">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="text-base font-semibold">{qb.nombre}</dt>
              <dd className="text-base tabular-nums">suelta en {fmtSegundos(qb.lanzamiento_s)} s</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="sr-only">Diferencia con el tiempo seguro</dt>
              <dd className={`text-sm ${tarde ? 'text-rojo' : 'text-verde'}`}>
                <span className="tabular-nums">{fmtConSigno(qb.diferencia_s)} s</span>{' '}
                {aTiempo ? 'justo a tiempo' : tarde ? 'tarde' : 'a tiempo'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Por dónde llega */}
        <div className="panel flex flex-col gap-4 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-apagado">Por dónde llega la presión</h2>
          <CampoMini lados={lados} amenaza={amenaza} />
          <p className="border-t border-linea pt-3 text-base">
            <span className="text-apagado">Lo cuida: </span>
            <span className="font-semibold">{apellido(bloqueador.nombre)}</span>{' '}
            <span className="text-apagado">({bloqueador.posicion})</span> ·{' '}
            <span className="tabular-nums">{fmtPorcentajeDecimal(bloqueador.pierde_pct)}</span>{' '}
            <span className="text-apagado">de duelos perdidos</span>
          </p>
        </div>
      </section>

      {/* 3 claves */}
      <section className="panel p-6" aria-labelledby="titulo-claves">
        <h2 id="titulo-claves" className="text-sm font-medium uppercase tracking-wide text-apagado">
          {claves.length === 1 ? 'Clave del partido' : `${claves.length} claves del partido`}
        </h2>
        <ol className="mt-4 divide-y divide-linea">
          {claves.map((clave, i) => (
            <li key={clave.accion} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-linea text-sm font-semibold tabular-nums text-apagado"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-semibold leading-snug text-balance">{clave.accion}</p>
                <p className="mt-1 text-sm text-apagado tabular-nums text-pretty">{clave.dato}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Contexto */}
      <section aria-label="Contexto del rival contra la liga" className="flex flex-wrap gap-3">
        <Pastilla etiqueta="Presión" rival={contexto.presion[0]} liga={contexto.presion[1]} />
        <Pastilla etiqueta="3er down" rival={contexto.tercer_down[0]} liga={contexto.tercer_down[1]} />
        <Pastilla etiqueta="Blitz" rival={contexto.blitz[0]} liga={contexto.blitz[1]} />
      </section>
    </div>
  )
}
