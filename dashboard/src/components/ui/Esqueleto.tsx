/**
 * Esqueleto con la forma del contenido final. Sin brillo en bucle: solo una superficie neutra
 * (un pulso infinito en un elemento persistente es decoración, no información).
 */
interface Props {
  className?: string
}

export function Esqueleto({ className = '' }: Props) {
  return <div aria-hidden="true" className={`rounded bg-elevado ${className}`} />
}

/** Forma de la pestaña Partido mientras llega la respuesta. */
export function EsqueletoPartido() {
  return (
    <div role="status" aria-label="Cargando el partido" className="grid gap-6 lg:grid-cols-2">
      <div className="panel flex flex-col gap-4 p-6">
        <Esqueleto className="h-4 w-48" />
        <Esqueleto className="h-24 w-40" />
        <Esqueleto className="h-4 w-32" />
        <Esqueleto className="h-4 w-56" />
      </div>
      <div className="panel p-6">
        <Esqueleto className="h-[200px] w-full" />
      </div>
      <div className="panel flex flex-col gap-4 p-6 lg:col-span-2">
        <Esqueleto className="h-6 w-2/3" />
        <Esqueleto className="h-6 w-1/2" />
        <Esqueleto className="h-6 w-3/5" />
      </div>
    </div>
  )
}
