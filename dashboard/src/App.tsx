/**
 * Hoja de Protección · NFL Big Data Bowl UNAM.
 * Una sola vista: arriba los dos equipos y las 5 pestañas; abajo la pestaña activa.
 * Los equipos y la pestaña viven en la URL para poder compartir la pantalla y sobrevivir a un recargo.
 */
import { useEffect, useState } from 'react'
import { api, USE_MOCK } from './api/client'
import type { Opciones } from './api/types'
import { Pestanas } from './components/ui/Pestanas'
import { SelectorEquipo } from './components/ui/SelectorEquipo'
import { EstadoError } from './components/ui/EstadoError'
import { Esqueleto } from './components/ui/Esqueleto'
import { Cambiar } from './features/cambiar/Cambiar'
import { Estrella } from './features/estrella/Estrella'
import { Partido } from './features/partido/Partido'
import { Repeticion } from './features/repeticion/Repeticion'
import { Situacion } from './features/situacion/Situacion'
import { fmtPorcentajeDecimal } from './lib/format'
import { usarRecurso } from './lib/usarRecurso'

type Vista = 'partido' | 'situacion' | 'cambiar' | 'estrella' | 'repeticion'

const PESTANAS = [
  { id: 'partido' as const, etiqueta: 'Partido' },
  { id: 'situacion' as const, etiqueta: 'Situación' },
  { id: 'cambiar' as const, etiqueta: 'Cambiar jugada' },
  { id: 'estrella' as const, etiqueta: 'Sin su estrella' },
  { id: 'repeticion' as const, etiqueta: 'Repetición' },
]

const POR_DEFECTO = { ofensiva: 'TB', rival: 'CLE', vista: 'partido' as Vista }

function leerUrl() {
  const p = new URLSearchParams(window.location.search)
  const vista = p.get('vista')
  return {
    ofensiva: p.get('ofensiva') ?? POR_DEFECTO.ofensiva,
    rival: p.get('rival') ?? POR_DEFECTO.rival,
    vista: PESTANAS.some((t) => t.id === vista) ? (vista as Vista) : POR_DEFECTO.vista,
  }
}

export default function App() {
  const inicial = leerUrl()
  const [ofensiva, setOfensiva] = useState(inicial.ofensiva)
  const [rival, setRival] = useState(inicial.rival)
  const [vista, setVista] = useState<Vista>(inicial.vista)

  const opciones = usarRecurso<Opciones>((senal) => api.opciones(senal), [])
  const equipos = opciones.datos?.equipos ?? []

  // Si la URL traía un equipo que no existe, se cae a los equipos por defecto.
  useEffect(() => {
    if (equipos.length === 0) return
    if (!equipos.includes(ofensiva)) setOfensiva(equipos.includes(POR_DEFECTO.ofensiva) ? POR_DEFECTO.ofensiva : equipos[0])
    if (!equipos.includes(rival)) setRival(equipos.includes(POR_DEFECTO.rival) ? POR_DEFECTO.rival : equipos[1] ?? equipos[0])
  }, [equipos, ofensiva, rival])

  useEffect(() => {
    const p = new URLSearchParams({ ofensiva, rival, vista })
    // Ruta relativa: la app vive en una subruta y no debe saber cuál es.
    window.history.replaceState(null, '', `?${p.toString()}`)
  }, [ofensiva, rival, vista])

  const cambiarOfensiva = (equipo: string) => {
    setOfensiva(equipo)
    if (equipo === rival) setRival(equipos.find((e) => e !== equipo) ?? rival)
  }

  const cambiarRival = (equipo: string) => {
    setRival(equipo)
    if (equipo === ofensiva) setOfensiva(equipos.find((e) => e !== equipo) ?? ofensiva)
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Hoja de protección</h1>
            <p className="text-sm text-apagado">
              Cuánto tiempo tiene tu QB y por dónde llega la presión.
            </p>
          </div>
          <div className="flex items-end gap-4" data-print="ocultar">
            {opciones.cargando && equipos.length === 0 ? (
              <>
                <Esqueleto className="h-[44px] w-28" />
                <Esqueleto className="h-[44px] w-28" />
              </>
            ) : (
              <>
                <SelectorEquipo
                  id="mi-equipo"
                  etiqueta="Mi equipo"
                  valor={ofensiva}
                  equipos={equipos}
                  excluir={rival}
                  onCambio={cambiarOfensiva}
                />
                <span aria-hidden="true" className="pb-3 text-sm text-apagado">
                  vs
                </span>
                <SelectorEquipo
                  id="rival"
                  etiqueta="Rival"
                  valor={rival}
                  equipos={equipos}
                  excluir={ofensiva}
                  onCambio={cambiarRival}
                />
              </>
            )}
          </div>
        </div>

        {/* En papel, el encabezado dice de qué partido es la hoja. */}
        <p className="hidden text-base font-semibold print:block">
          {ofensiva} con balón contra la defensa de {rival}
        </p>

        <div className="border-b border-linea pb-1" data-print="ocultar">
          <Pestanas pestanas={PESTANAS} actual={vista} onCambio={setVista} />
        </div>
      </header>

      <main
        id={`panel-${vista}`}
        role="tabpanel"
        aria-labelledby={`pestana-${vista}`}
        tabIndex={-1}
        className="flex-1"
      >
        {opciones.error ? (
          <EstadoError mensaje={opciones.error} estado={opciones.estado} onReintentar={opciones.reintentar} />
        ) : equipos.length === 0 ? (
          <Esqueleto className="h-64 w-full" />
        ) : vista === 'partido' ? (
          <Partido ofensiva={ofensiva} rival={rival} />
        ) : vista === 'situacion' ? (
          <Situacion rival={rival} />
        ) : vista === 'cambiar' ? (
          <Cambiar rival={rival} />
        ) : vista === 'estrella' ? (
          <Estrella rival={rival} />
        ) : (
          <Repeticion rival={rival} />
        )}
      </main>

      <footer className="border-t border-linea pt-4 text-sm text-apagado">
        <p className="text-pretty">
          Datos de las semanas 1 a 8 de 2021 (NFL Big Data Bowl 2023). Nuestra marca de presión coincide con la de PFF
          en{' '}
          <span className="tabular-nums">
            {opciones.datos ? fmtPorcentajeDecimal(opciones.datos.validacion_pct) : '—'}
          </span>{' '}
          de las jugadas. Nada de lo que se muestra ocurre después del lanzamiento.
          {USE_MOCK && ' Datos de ejemplo (USE_MOCK activo).'}
        </p>
      </footer>
    </div>
  )
}
