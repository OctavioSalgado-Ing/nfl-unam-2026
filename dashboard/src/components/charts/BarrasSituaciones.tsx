/**
 * Las 4 situaciones de un rival contra la liga, en barras horizontales ordenadas por situación.
 * Responde a una pregunta concreta del coach: en qué situación está más expuesto.
 * Recharts 3.10.1: sin animación (dato funcional), sin Cell, colores desde las variables CSS.
 */
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { Sit, Situacion } from '../../api/types'
import { ETIQUETA_SIT, fmtPorcentaje } from '../../lib/format'
import { COLOR } from '../../lib/nivel'

interface Props {
  datos: Record<Sit, Situacion | null>
  actual: Sit
}

const ORDEN: Sit[] = ['a', 'c', 'm', 'l']

export function BarrasSituaciones({ datos, actual }: Props) {
  const filas = ORDEN.filter((s) => datos[s]).map((s) => ({
    sit: s,
    etiqueta: ETIQUETA_SIT[s],
    rival: datos[s]!.presion_pct,
    liga: datos[s]!.presion_liga_pct,
  }))

  if (filas.length === 0) return null

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="etiqueta">Presión por situación, rival contra liga</figcaption>
      <BarChart
        responsive
        style={{ width: '100%', height: 190 }}
        data={filas}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        barGap={2}
      >
        <CartesianGrid horizontal={false} stroke={COLOR.linea} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => fmtPorcentaje(v)}
          tick={{ fill: COLOR.apagado, fontSize: 12 }}
          stroke={COLOR.linea}
        />
        <YAxis
          type="category"
          dataKey="etiqueta"
          width={72}
          tick={{ fill: COLOR.apagado, fontSize: 13 }}
          stroke={COLOR.linea}
        />
        <Tooltip
          isAnimationActive={false}
          cursor={{ fill: 'rgb(var(--raised) / 0.6)' }}
          content={(props) => {
            if (!props.active || !props.payload?.length) return null
            return (
              <div className="rounded border border-linea bg-elevado px-3 py-2 text-sm shadow-lg">
                <p className="font-medium">{String(props.label ?? '')}</p>
                {props.payload.map((entrada) => (
                  <p key={String(entrada.dataKey)} className="tabular-nums text-apagado">
                    {entrada.dataKey === 'rival' ? 'Rival' : 'Liga'}:{' '}
                    <span className="text-tinta">{fmtPorcentaje(Number(entrada.value))}</span>
                  </p>
                ))}
              </div>
            )
          }}
        />
        <Bar
          dataKey="rival"
          name="Rival"
          fill={COLOR.acento}
          radius={[0, 2, 2, 0]}
          isAnimationActive={false}
          label={{
            position: 'right',
            fill: COLOR.tinta,
            fontSize: 12,
            formatter: (v) => (v === undefined ? '' : fmtPorcentaje(Number(v))),
          }}
        />
        <Bar dataKey="liga" name="Liga" fill={COLOR.linea} radius={[0, 2, 2, 0]} isAnimationActive={false} />
      </BarChart>
      <p className="text-sm text-apagado">
        Situación seleccionada: <span className="text-tinta">{ETIQUETA_SIT[actual]}</span>. La barra clara es el rival;
        la oscura, el promedio de la liga.
      </p>
    </figure>
  )
}
