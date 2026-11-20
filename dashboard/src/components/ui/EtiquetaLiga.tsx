/**
 * Marca cuándo un número no es del rival sino de la liga (menos de 20 jugadas en esa situación).
 * La app nunca presenta un dato de la liga como si fuera del rival.
 */
export function EtiquetaLiga() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-ambar px-2 py-1 text-xs font-medium text-ambar">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" aria-hidden="true">
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
        <circle cx="12" cy="12" r="4" />
      </svg>
      Dato de la liga: pocas jugadas del rival
    </span>
  )
}
