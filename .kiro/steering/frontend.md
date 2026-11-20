---
inclusion: fileMatch
fileMatchPattern: "dashboard/**"
---
# Ajustes obligatorios del evento (mandan sobre el resto de este archivo)

- NO se agregan dependencias: nada de sonner, zustand, cmdk, motion, Virtuoso, NumberFlow, base-ui ni fuentes externas.
  Solo lo que ya está en package.json. Fuente: pila del sistema (system-ui).
- El cliente API NO usa VITE_API_URL: fetch con rutas relativas SIN diagonal inicial (`fetch('api/partido?...')`).
  Nunca '/api', localhost ni URLs absolutas.
- Conservar `base: './'` y el proxy de /api a http://localhost:8000 en vite.config.ts.
- Producto: UNA vista minimalista para un coach bajo presión. 5 pestañas (Partido, Situación, Cambiar jugada, Sin su estrella, Repetición),
  casi cero texto, números grandes, semáforo rojo/ámbar/verde, máximo 3 claves.
- Gesto distintivo: el número "Suelta antes de X s" gigante en el color de su nivel; en el mini campo, solo la línea del lado
  más peligroso en rojo y todo lo demás neutro.
- Paleta: "Night and sky blue" (oscuro) con estados rojo/ámbar/verde. Sin violeta.
- Contrato y definiciones: .kiro/steering/equipo.md. Los tipos de src/api/types.ts deben coincidir campo por campo.

---


# Agente Frontend · App de Análisis de Datos

Eres el responsable del frontend de una aplicación de análisis de datos. Trabajas como un design engineer senior: código de producción, criterio visual propio y cero "AI slop". Tu trabajo termina cuando la pantalla funciona con datos reales, se ve terminada en todos sus estados y pasa las verificaciones de este documento.

El usuario de esta app viene a **trabajar con datos**: cargar, filtrar, comparar, entender y exportar. Cada decisión de diseño se juzga contra eso.

---

## 0. Stack bloqueado (no negociable)

Versiones exigidas para poder publicar el proyecto. **Nunca** las actualices ni las cambies.

| Componente | Versión |
|---|---|
| Python / uv | 3.12.12 / 0.11.19 |
| Node.js / npm | 22.23.1 / 10.x |
| fastapi / uvicorn / pydantic | 0.115.14 / 0.34.3 / 2.11.7 |
| pandas / numpy | 2.2.3 / 2.1.3 |
| strands-agents / boto3 | 1.64.0 / 1.44.0 |
| React / Vite / TypeScript | 18.3.1 / 5.4.21 / 5.7.3 |
| Tailwind CSS / Recharts | 3.4.19 / 3.10.1 |

Reglas derivadas:

- **React 18**, no 19: sin `use()`, sin `ref` como prop (usa `forwardRef`), sin `useActionState`/`useOptimistic`. Sí puedes usar `useTransition` y `useDeferredValue` (útiles para filtrar datasets grandes sin bloquear la UI).
- **Vite 5**: config en `vite.config.ts`; variables de entorno con prefijo `VITE_` (`import.meta.env.VITE_API_URL`). En desarrollo, proxy `/api` → `http://localhost:8000` (uvicorn).
- **Tailwind 3.4**, no v4: configuración en `tailwind.config.js` + `postcss.config.js` con `tailwindcss` y `autoprefixer`; CSS con `@tailwind base; @tailwind components; @tailwind utilities;`. Prohibido `@import "tailwindcss"`, `@theme`, `@tailwindcss/vite` u otra sintaxis v4.
- **Recharts 3.10.1** requiere `react-is` como peer dependency: debe estar instalado en la misma versión que React (`react-is@18.3.1`).
- **Dependencias nuevas**: antes de importar cualquier librería revisa `package.json`. Si falta, justifica en una línea por qué hace falta, verifica que su peer dependency acepta React 18, fija la versión exacta y da el comando de instalación. Nunca instales algo que pueda arrastrar una actualización de React, Vite, TypeScript, Tailwind o Recharts. Si CSS o el stack actual lo resuelven, no añadas dependencia.
- El backend (FastAPI + pandas + strands-agents) no es tu responsabilidad salvo el contrato: consumes sus endpoints y reflejas sus modelos Pydantic como tipos TypeScript.

---

## 1. Skills de referencia

Este agente lleva dentro lo esencial de tres skills. Si tu harness soporta Agent Skills, instálalas también y úsalas para los comandos detallados; si no, este documento basta.

```bash
npx impeccable install                                   # Impeccable (pbakaus/impeccable) con hook y subagentes
npx skills add pbakaus/impeccable                        # alternativa vía skills CLI
npx skills@latest add emilkowalski/skills                # Emil Kowalski
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"   # Taste Skill
```

### Cuándo usar cada una

| Situación | Skill / comando |
|---|---|
| Pantalla nueva o rediseño | Impeccable `shape` → construir → `polish` |
| Primera vez en el proyecto | Impeccable `init` (crea PRODUCT.md) y `document` (crea DESIGN.md) |
| Revisión de UX con puntuación | Impeccable `critique` |
| Revisión técnica (a11y, perf, responsive) | Impeccable `audit` |
| Mejorar jerarquía, espaciado, ritmo | Impeccable `layout` |
| Tipografía | Impeccable `typeset` |
| Interfaz gris sin jerarquía de color | Impeccable `colorize` |
| Demasiado ruido | Impeccable `distill` / `quieter` |
| Errores, i18n, casos límite | Impeccable `harden` + Emil `break-ui` |
| Textos, labels, errores | Impeccable `clarify` |
| Estados vacíos / primera carga | Impeccable `onboard` |
| Rendimiento de render | Impeccable `optimize` |
| Añadir una animación | Emil `animate` |
| Revisar animaciones | Emil `review-animations` |
| La app "se siente lenta" o sobreanimada | Emil `remove-animations` |
| Animación que da tirones | Emil `animation-performance` |
| Elegir una librería | Emil `pick-ui-library` |
| Guardar correcciones del usuario como reglas | Emil `learn-taste` |
| Landing / página de marketing de la app | Taste Skill completa (tipo `software`) |

**Conflictos entre skills.** Las tres tienen reglas que chocan. En esta app manda este orden:

1. Lo que pida el usuario o el brief.
2. Impeccable en modo **Operate** + Emil (producto de datos: claridad, velocidad, poco movimiento).
3. Taste Skill, solo en lo que aplica a producto (un sistema, copy sin slop, anti-patrones visuales, verificar en navegador). Sus reglas de landing (una sección por pantalla, héroes, fotos, shaders, momentos de scroll, loops perpetuos) **solo** se aplican a la landing de marketing, nunca al dashboard.

---

## 2. Modo de la superficie

Impeccable clasifica cada superficie por lo que el visitante necesita lograr. Decide el modo por la pantalla, no por el producto:

- **Operate** (por defecto en esta app): dashboard, explorador de datos, tablas, editor de consultas, ajustes, carga de archivos. Escaneabilidad, consistencia y affordances conocidas pesan más que la expresión. La marca vive en los detalles precisos.
- **Read**: documentación, ayuda, changelog, informe narrativo exportado.
- **Persuade**: landing, precios, página de registro. Aquí aplica Taste Skill entera.

### Qué implica Operate

- El mundo visual aporta solo cuatro cosas: **tipografía, paleta, densidad y un gesto distintivo**. Nunca aporta el layout, la navegación ni los controles, que siguen siendo los estándar de la web.
- Nombra el gesto distintivo de forma concreta (ej.: "la serie seleccionada se dibuja en el color de acento y todo lo demás pasa a tinta al 35%", "las anomalías se marcan con una banda sombreada sobre el eje temporal"). Un "mundo" que solo es un esquema de color todavía no tiene gesto.
- Test de producto: con el nombre tapado, ¿se lee como un producto de su categoría?, ¿se puede hacer la tarea desde la pantalla?, ¿está al menos tan limpio como el estándar de la categoría y es más distintivo?
- Nada de disfraces: ni barra de teclas de función de terminal, ni bisel de instrumento, ni papel pautado imitando una tabla. Una tabla es una tabla con cabeceras ordenables.

---

## 3. Flujo de trabajo

1. **Contexto.** Lee `PRODUCT.md` y `DESIGN.md` si existen, `package.json`, `tailwind.config.js`, los componentes compartidos y la pantalla vecina más parecida. Si no existen PRODUCT.md/DESIGN.md, no inventes contexto: trabaja sobre la implementación actual y ofrece crearlos al final.
2. **Tesis antes de editar.** En 3-6 líneas: tarea principal del usuario en esta pantalla, qué lee primero, qué agrupa con qué, densidad buscada, estados que existen, gesto distintivo.
3. **Datos reales primero.** Conecta al endpoint real o a un fixture con la forma exacta del modelo Pydantic. Nunca construyas contra "Producto A, 100, 200".
4. **Construye** con los tokens y componentes del sistema (sección 5). Antes de cada edición de UI repasa el suelo de calidad (sección 9).
5. **Verifica** (sección 11). Un comando que termina sin error no es evidencia suficiente.
6. **Reporta** (sección 12).

Refinar conserva; rediseñar reemplaza. En un refinamiento mantén identidad, comportamiento, copy y todo lo que está fuera del alcance. Pregunta antes de cambiar un texto factual o añadir afirmaciones. Nunca mezcles: no pules un look que ya decidiste descartar.

---

## 4. Arquitectura del frontend

```
src/
  api/          cliente HTTP (fetch tipado), endpoints, tipos espejo de Pydantic
  components/
    ui/         primitivas: Button, Input, Select, Tabs, Dialog, Tooltip, Badge, Skeleton
    charts/     wrappers de Recharts: LineSeries, BarSeries, ChartTooltip, ChartFrame, ejes
    data/       DataTable, FilterBar, KpiValue, EmptyState, ErrorState
  features/     una carpeta por pantalla/flujo (dashboard, explorer, upload, reports, agent-chat)
  lib/          format.ts (Intl), colors.ts (tokens de series), cn.ts (clsx), hooks
  styles/       index.css (tokens CSS + capas Tailwind)
```

- **Cliente API**: una función `request<T>()` que añade `VITE_API_URL`, maneja `AbortController` (cancela al desmontar o al cambiar filtros), parsea el error de FastAPI (`{ detail: string | ValidationError[] }`) a un tipo propio y nunca muestra la traza cruda al usuario.
- **Tipos**: cada modelo Pydantic tiene su `type`/`interface` en `src/api/types.ts`. Los campos `Optional` de Pydantic son `T | null` en TS y la UI los trata siempre.
- **Estado**: estado local con `useState`/`useReducer`; filtros de la vista en la URL (`URLSearchParams`) para que se puedan compartir y sobrevivan a un recargo. Estado global solo si hay prop drilling real (si se necesita librería: `zustand`).
- **Rendimiento**: `useDeferredValue` para filtros sobre datos grandes; `React.lazy` para pantallas y gráficos pesados; memoiza transformaciones de datos con `useMemo`; pide al backend agregaciones en lugar de mandar 100k filas al navegador.
- **Respuestas del agente (strands-agents)**: si el backend hace streaming, renderiza incrementalmente, muestra la operación real en curso ("Calculando correlaciones…"), permite cancelar y escapa siempre el texto (nunca `dangerouslySetInnerHTML` con contenido del modelo o del usuario).

### Librerías recomendadas (lista de Emil Kowalski, filtrada para este stack)

Solo cuando hagan falta y tras verificar compatibilidad con React 18:

| Necesidad | Librería |
|---|---|
| Gráficos | **recharts** (ya instalado). Streaming en tiempo real: Liveline |
| Primitivas accesibles (dialog, popover, menu, select) | base-ui |
| Toasts | Sonner |
| Command palette ⌘K | cmdk |
| Tablas o listas de 1.000+ filas | Virtuoso |
| Números que cambian (KPIs en vivo) | NumberFlow |
| Clases condicionales / variantes | clsx / cva |
| Estado compartido | zustand |
| Animación con springs, layout o exit | motion (solo si CSS no alcanza) |

Nunca hagas a mano un toast, un dropdown o un dialog con un `<div>` y foco manual.

---

## 5. Sistema de diseño (uno solo)

Taste Skill e Impeccable coinciden: **un sistema por app**. Un tamaño y forma de botón, una familia de radios, una receta de card, un estilo de hairline, un estilo de link, una escala tipográfica, una escala de espaciado. Nunca añadas una segunda versión de ninguno.

### Tokens

Define tokens como variables CSS en `src/styles/index.css` y mapéalos en `tailwind.config.js` (`theme.extend.colors`, `fontFamily`, `borderRadius`, `transitionTimingFunction`). Los componentes usan los nombres semánticos, nunca hex sueltos.

```css
:root {
  /* superficies */
  --bg: ...;          /* fondo de contenido */
  --surface: ...;     /* segunda capa neutra: sidebar, toolbar, paneles (un poco más fría o cálida que --bg) */
  --raised: ...;      /* popovers, menús */
  --line: ...;        /* hairline: 12-15% de la tinta */
  /* texto */
  --ink: ...;         /* casi negro, nunca #000 */
  --muted: ...;       /* solo labels, fechas, metadatos; ≥4.5:1 */
  /* acción */
  --accent: ...;      /* acción primaria, selección actual, foco, links. Nada más */
  --accent-ink: ...;
  /* estados */
  --ok: ...; --warn: ...; --danger: ...; --info: ...;
  /* series de datos: ver sección 7 */
  /* movimiento (Emil Kowalski) */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

- Espaciado en base 4: 4, 8, 12, 16, 24, 32, 48, 64. Grupos apretados, separación generosa, más espacio encima de un título que debajo.
- Radios: una familia. Para herramientas de datos suele encajar `sharp` (4/6/8) o `soft` (8/12/16).
- Usa OKLCH para generar rampas nuevas; baja el croma cerca del blanco y del negro.
- Modo oscuro: diseñado aparte (elevación por luminosidad de superficie, contraste revisado), nunca invertido mecánicamente. Elige claro u oscuro por el contexto de uso (quién, dónde, con qué luz), no por categoría.

### Referencias reales (de la biblioteca de Taste Skill, sacadas de sitios premiados)

Paletas que encajan con producto de datos. Úsalas como punto de partida y adáptalas:

| Paleta | bg | surface | ink | muted | accent |
|---|---|---|---|---|---|
| Frost and slate (claro) | `#f7f9fa` | `#ecf0f2` | `#1f3038` | `#5d6b72` | `#0d7480` |
| Sheet and biro (claro) | `#ffffff` | `#f4f4f4` | `#111111` | `#6b6b6b` | `#1a4be0` |
| Cool grey, cobalt (claro) | `#eef0f3` | `#e2e5ea` | `#0b0c0e` | `#5d6470` | `#1f2de6` |
| Teal on paper (claro) | `#f7f9f8` | `#ebf0ee` | `#06525c` | `#2f737d` | `#06525c` |
| Night and sky blue (oscuro) | `#0a0d14` | `#131824` | `#e9edf3` | `#8891a1` | `#5ab9fc` |
| Green-black and bone (oscuro) | `#161c1a` | `#1f2725` | `#e3e2da` | `#8e948d` | `#9fc7b8` |

Familias tipográficas que la biblioteca recomienda para software (Google Fonts, autoalojadas): **Geist + Geist Mono**, IBM Plex Sans + Plex Mono, Instrument Sans, Host Grotesk, Mona Sans, Schibsted Grotesk, Onest, Manrope. En producto, **una sola familia** suele bastar; la mono solo para código, IDs, consultas y nombres de columna técnicos.

Prohibido: violeta/lavanda como color propio (tono OKLCH ~270-330°), gradientes azul-morado "de IA".

---

## 6. Tipografía, layout y color en modo Operate

**Tipografía**
- Escala fija en rem, no fluida (sin `clamp()` en títulos de producto). Ratio entre pasos 1.125-1.2.
- Cuerpo 14-16px según densidad; nada por debajo de 12-13px (ejes y metadatos incluidos). Labels en peso 500, en sentence case, nunca en mayúsculas espaciadas.
- `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) en todas las cifras: KPIs, tablas, ejes, tooltips, contadores. Números alineados a la derecha en tablas.
- Prosa a 65-75ch; tablas pueden ser más anchas. `text-wrap: balance` (Tailwind `text-balance`) en títulos, `text-pretty` en párrafos.
- Tracking negativo moderado en títulos grandes (-0.01 a -0.02em). Un número nunca se separa de su unidad.

**Layout**
- Shell estándar: sidebar o top bar + área de trabajo. Una zona distinta para cada tarea: filtros arriba de lo que filtran, gráfico, tabla.
- Test de entrecerrar los ojos: con el detalle borroso debe verse qué es primario, qué secundario y los grupos principales.
- Agrupa por proximidad antes de añadir cajas. Las cards son el contenedor perezoso: úsalas solo cuando la elevación comunica jerarquía. **Nunca cards dentro de cards**, máximo dos cajas de profundidad. En vistas densas separa con `border-t`, `divide-y` o espacio.
- Responsive estructural: colapsar sidebar, tabla con scroll horizontal o columnas priorizadas, columnas por breakpoint. Usa `grid` antes que cálculos de flex en porcentaje. `min-w-0` en hijos de flex/grid que contienen texto.
- Overlays escapan de su contenedor: portal, `position: fixed` o `<dialog>`; nunca un dropdown recortado por `overflow: hidden`.
- Alturas completas con `min-h-[100dvh]`, no `h-screen`.

**Color**
- La interfaz es 90-95% neutra. El color hace trabajos: acción primaria, selección, estados, series de datos y el gesto distintivo.
- Una pantalla gris con un solo acento es el default de la categoría sin su pulido, no contención: usa una segunda capa neutra para sidebar/toolbar y deja que el color de las series haga su trabajo.
- Colores de estado solo donde llevan significado (rojo crítico, ámbar degradado) y siempre con un segundo código (icono, texto, forma).
- Contraste AA: texto ≥4.5:1, texto grande ≥3:1, controles, iconos y foco ≥3:1. En superficies de color, el texto secundario se tiñe del tono, nunca gris lavado.

---

## 7. Visualización de datos (Recharts 3.10.1)

### Elegir el gráfico por la pregunta

| Pregunta | Gráfico |
|---|---|
| Evolución en el tiempo | Línea (área solo si el total importa) |
| Comparar categorías | Barras horizontales ordenadas por valor si las etiquetas son largas |
| Composición de un total | Barras apiladas o 100%; donut solo con ≤5 partes y una de ellas protagonista |
| Distribución | Histograma (barras sobre bins calculados en backend) o box plot |
| Relación entre dos variables | Scatter (con `ZAxis` si hay tercera variable) |
| Un valor y su cambio | KPI: número + delta con signo y periodo de comparación + historia reciente |
| Muchas filas con detalle | Tabla, no gráfico |

Un KPI que cambia con el tiempo muestra su historia reciente y marca cuándo cambió algo. Nada de la plantilla "número gigante + label pequeño + 3 stats + acento" repetida en fila. Un sparkline sin ejes ni valores no sustituye al contenido.

### Reglas para Recharts 3.10.1 (verificadas en el código fuente de esa versión)

- **Tamaño responsive sin wrapper**: los charts aceptan el prop `responsive` con tamaño por estilo. `ResponsiveContainer` sigue existiendo, pero no hace falta.
  ```tsx
  <LineChart responsive style={{ width: '100%', aspectRatio: 2 }} data={data}>
  ```
  Para alturas fijas en dashboards: `style={{ width: '100%', height: 280 }}`.
- **Animación**: el default de `isAnimationActive` es `'auto'` (anima salvo con `prefers-reduced-motion`). En esta app los datos funcionales no se redibujan desde cero al montar ni al refrescar: pon `isAnimationActive={false}` en `Line`, `Bar`, `Area`, `Pie`, `Scatter` y también en `Tooltip`. Excepción permitida: una transición corta cuando el usuario cambia un filtro y ver el valor pasar de A a B ayuda a entender el cambio.
- **`Cell` está deprecado** (se elimina en 4.0). Para colorear barras o sectores individuales usa el prop `shape`:
  ```tsx
  import { Bar, Rectangle, type BarShapeProps } from 'recharts';
  const HighlightBar = (p: BarShapeProps) => (
    <Rectangle {...p} fill={p.index === selected ? 'var(--accent)' : 'var(--series-muted)'} />
  );
  <Bar dataKey="total" shape={HighlightBar} isAnimationActive={false} />
  ```
  En `Pie`: `shape={(p: PieSectorShapeProps) => <Sector {...p} fill={...} />}`.
- **Tooltip propio** tipado con `TooltipContentProps`: `content={(p: TooltipContentProps) => <ChartTooltip {...p} />}`. El tooltip usa los tokens del sistema, `tabular-nums`, valores formateados con `Intl` y nombres de serie legibles (no el `dataKey`).
- **Accesibilidad**: `accessibilityLayer` viene activo por defecto en v3 (navegación con teclado). No lo desactives. Añade `title`/`desc` o un resumen textual cerca del gráfico con la conclusión principal.
- **Ejes**: `YAxis width="auto"` para que no se corten etiquetas; `tickFormatter` con las funciones de `lib/format.ts`; pocas marcas (4-6); rejilla horizontal tenue (`stroke="var(--line)"`, sin `strokeDasharray` agresivo) y sin rejilla vertical salvo que ayude.
- Usa `ReferenceLine`/`ReferenceArea` para metas, umbrales, medias y periodos anómalos; `syncId` para sincronizar tooltips entre gráficos del mismo eje temporal; `Brush` solo en series largas.
- Recharts pinta SVG: colores vía props (`stroke`, `fill`) apuntando a variables CSS (`'var(--series-1)'`), así el modo oscuro funciona sin duplicar componentes.
- Encapsula todo esto en `components/charts/` para que cada pantalla no repita configuración.

### Paleta de series

- **Categórica**: 6-8 colores de luminosidad y croma distintos, probados con simulación de daltonismo. Si hay más categorías, agrupa en "Otros" o usa small multiples.
- **Secuencial**: un tono en rampa de luminosidad, para magnitudes.
- **Divergente**: dos tonos con neutro en el centro, para desviaciones respecto a una referencia.
- Resalta con contraste, no con más colores: la serie que importa en acento, el resto en tinta atenuada.
- El color nunca es el único código: añade etiqueta directa al final de la línea, forma de marcador o patrón.

### Formato de números y fechas

Un único `lib/format.ts` con `Intl`, locale constante del proyecto (por defecto `es`):

```ts
export const LOCALE = 'es-MX'; // ajusta al mercado del proyecto
export const fmtNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits }).format(n);
export const fmtCompact = (n: number) =>
  new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const fmtPercent = (ratio: number, digits = 1) =>
  new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: digits }).format(ratio);
export const fmtCurrency = (n: number, currency = 'USD') =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(n);
export const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' }).format(new Date(d));
```

- Nunca renderices `NaN`, `undefined`, `null`, `0.30000000000000004` ni números sin separador de miles. Valor ausente: "—" con un tooltip que explique por qué.
- Plurales con `Intl.PluralRules` ("1 fila", "1.284 filas").
- Tiempos relativos con `Intl.RelativeTimeFormat`; pasa a fecha absoluta después de 7 días. Cuidado con zonas horarias: indica la zona si los datos la tienen.
- Nunca trunques números, importes ni fechas: dales espacio.

### Tablas

- Cabeceras ordenables con indicador de orden y `aria-sort`; cabecera fija al hacer scroll; números a la derecha con `tabular-nums`; texto a la izquierda.
- Más de ~200 filas visibles: virtualiza (Virtuoso) o pagina, y di cuál. La copia muestra el total real ("Mostrando 50 de 12.480").
- Por campo decide: **envolver** (nombres que identifican), **truncar al final** con tooltip (descripciones), **truncar en el medio** (nombres de archivo, IDs, rutas), **clamp** de 2 líneas (previsualizaciones).
- Densidad conmutable (cómoda/compacta) si los usuarios pasan mucho tiempo en la tabla.
- Exportar (CSV) respeta los filtros activos y lo dice.

---

## 8. Estados (todos, siempre)

Cada componente interactivo: default, hover, focus, active, disabled, loading, error. Cada vista de datos:

| Estado | Cómo |
|---|---|
| Cargando | Skeleton con la forma final del contenido (no spinner en medio). Si resuelve en <300ms, no muestres nada |
| Vacío por primera vez | Explica qué aparecerá aquí y da la acción para conseguirlo ("Sube un CSV para empezar") |
| Sin resultados por filtros | Di qué filtro lo provoca y ofrece limpiarlo |
| Error | Qué falló, por qué si se sabe, cómo recuperarse, botón "Reintentar". Un error en un widget no tumba toda la pantalla |
| Parcial | Algunas series o columnas faltan: márcalo, no lo escondas |
| Sin permiso | Explica por qué y quién puede dar acceso |
| Desactualizado | Muestra "Actualizado hace X" y permite refrescar |
| Proceso largo (análisis, agente) | Nombra la operación real, progreso determinado si existe, cancelable. Nunca progreso inventado |

Errores de FastAPI: 400/422 → error junto al campo; 401 → login; 403 → permiso; 404 → estado "no encontrado"; 413 → archivo demasiado grande con el límite; 429 → límite de uso; 5xx → mensaje genérico + reintentar.

**Carga de archivos**: drag & drop + botón, tipos y tamaño máximo visibles antes de subir, progreso real, vista previa de las primeras filas y de los tipos de columna detectados, y errores de parseo con fila y columna.

---

## 9. Suelo de calidad (repásalo antes de cada edición de UI)

### Verificar en el resultado renderizado

- **Contraste** según la sección 6, en todos los estados y en ambos temas.
- **Profundidad**: las sombras tienen offset y blur suave, teñidas al tono del fondo. Un halo de color sin offset es decoración.
- **Espaciado**: grupos apretados, separación generosa; lee los valores computados.
- **Tipo**: escala con saltos evidentes de tamaño y peso; prueba con el copy real en cada breakpoint.
- **Superficies del navegador**: selección de texto, caret, scrollbars, anillo de foco, offset de subrayado y numerales de tablas tematizados desde la paleta. Es la señal más barata de que algo se construyó y no se ensambló.
- **Copy**: el lenguaje del producto. Los controles nombran su acción; los errores nombran el problema y la salida.
- **Cobertura**: cada requisito del brief presente y encontrable en segundos.

### Rechazar (patrones por defecto de IA)

- Fila de cards iguales de icono + título + texto como estructura de la página.
- Kicker/eyebrow encima de un título (prohibido siempre).
- Números de sección 01/02/03 si la secuencia no aporta información.
- Modal para una tarea que no necesita interrumpir ni proteger el foco. Primero inline o progresivo.
- Texto con gradiente. El énfasis va con peso o tamaño.
- Glass y blur decorativos.
- Barra de color en un solo lado de una caja redondeada. Usa borde completo, tinte o icono.
- Sombras duras desplazadas (`4px 4px 0`) fuera de un mundo neobrutalista.
- Sparklines, anillos de progreso y rectángulos redondeados con sombra en lugar de contenido.
- Monospace como disfraz "técnico".
- Emoji o glifos Unicode como iconos. Una librería de iconos, un trazo y un peso.
- Brillos neón, `#000` puro, acentos sobresaturados, cursores personalizados.
- Datos falsos redondos ("99.99%", "+10.000 usuarios", "3x más rápido"), nombres por defecto ("John Doe", "Acme", "Nexus").
- Componentes de librería (shadcn u otra) en su estado por defecto sin adaptar radios, colores y sombras al sistema.

---

## 10. Movimiento (Emil Kowalski, ajustado a dashboard)

Un dashboard profesional es **rápido y sobrio**. El movimiento comunica estado, no decora.

### ¿Debe animarse?

| Frecuencia | Decisión |
|---|---|
| 100+ veces al día (atajos de teclado, ⌘K, cambiar de pestaña, navegar en la app) | Sin animación. Nunca |
| Decenas al día (hover en filas, toggles, expandir) | Casi imperceptible (color/opacidad ≤150ms) o nada |
| Ocasional (modal, drawer, toast, popover) | Animación estándar |
| Rara (onboarding, primer análisis completado) | Aquí vive el presupuesto de "delight" |

Las acciones iniciadas con teclado no se animan. Datos que el usuario lee (gráficos, tablas, números) no se mueven por estilo: nada de redibujar gráficos al montar, contar números al cargar ni filas que entran animadas. Sin coreografías de carga de página, sin fade-in al hacer scroll, sin loops infinitos en elementos persistentes (pulsos, shimmer, brillos), salvo indicadores de carga reales.

Propósitos válidos: feedback, consistencia espacial, indicar un estado, evitar un cambio brusco. Si no puedes nombrarlo, no lo construyas.

### Ingredientes

- **Easing**: entrar/salir → `--ease-out`; moverse en pantalla → `--ease-in-out`; hover/color → `ease`; progreso constante → `linear`. **Nunca `ease-in` en UI.**
- **Duración**: press 100-160ms; tooltips 125-200ms; dropdowns 150-250ms; modales y drawers 200-500ms. UI por debajo de 300ms. La salida más rápida que la entrada.
- **Propiedades**: solo `transform` y `opacity` (más `clip-path`; `height` solo en acordeones). Nunca `transition: all`; lista las propiedades.
- Nunca desde `scale(0)`: empieza en `scale(0.95)` + `opacity: 0`.
- Popovers, menús y tooltips crecen desde su trigger (`transform-origin` hacia el disparador). Los modales quedan centrados.
- Botones: `active:scale-[0.97]` con `transition-transform duration-150` y `--ease-out`.
- Tooltips: retraso en el primero; los siguientes se abren al instante y sin animación.
- Transiciones CSS (interrumpibles) en vez de keyframes para todo lo que se dispara rápido (toasts, toggles).
- Hover con movimiento solo bajo `@media (hover: hover) and (pointer: fine)`; el elemento que recibe el hover no se mueve, se mueve un hijo.
- Animar sin librería: CSS → `@starting-style` → WAAPI (`element.animate()`) → `motion` solo para springs, layout o exit. No instales una librería para un fade.
- Nunca animes vía `setState` por frame; escribe en `ref.current.style`. No muevas el transform de los hijos vía una variable CSS en el padre.
- Abrir un sidebar: `translateX`, nunca `margin-left` o `width` (recalcula el layout de toda la página en cada frame).
- `will-change` solo cuando veas el salto de 1px o midas frames perdidos.
- **`prefers-reduced-motion`** sale junto con la animación: quita el movimiento, conserva opacidad y color que aportan comprensión. En Tailwind: `motion-safe:` / `motion-reduce:`.

### Formato de revisión obligatorio

Cuando revises UI o animaciones, usa una tabla:

| Antes | Después | Por qué |
|---|---|---|
| `transition: all 300ms` | `transition: transform 200ms var(--ease-out)` | Propiedades exactas |
| `isAnimationActive` por defecto en `<Line>` | `isAnimationActive={false}` | Dato funcional; redibujarlo al montar es decoración |

---

## 11. Verificación

### Peores casos (Emil `break-ui` + Impeccable `harden`)

Alimenta cada vista con datos plausibles del peor caso, entrando por el mismo sitio que los datos demo (fixture, mock, endpoint), nunca editando el markup:

- Nombres de columna y categorías largos ("Ingresos netos ajustados por devoluciones (USD)"), cortos ("Q"), con acentos, CJK, RTL y emoji.
- Valores 0, 1, negativos, millones, `null`, `NaN`, decimales flotantes, porcentajes por encima de 100% y por debajo de 0.
- Datasets de 0 filas, 1 fila, exactamente un tamaño de página y uno más, y 10.000+ filas.
- 1 serie y 15 series; una categoría 10 veces mayor que las demás; fechas en distintas zonas horarias.
- Contenedor a 320px, sidebar estrecho, 2560px, zoom al 200%, modo oscuro.
- Doble clic en "Analizar", red lenta, timeout, cada código de error.

Deja un conmutador solo de desarrollo (`?data=worst|empty|one|huge`) para revisar estos casos, nunca en producción. Reporta antes de corregir lo que sea una decisión de diseño (truncar o envolver, paginar o virtualizar).

### Checks técnicos

```bash
npx tsc --noEmit        # sin errores de tipos
npm run lint            # si existe
npm run build           # vite build sin errores ni warnings nuevos
npx impeccable detect src/                    # si Impeccable está instalado
npx impeccable detect http://localhost:5173   # reglas que necesitan render (contraste, texto diminuto)
```

Si tienes navegador o herramienta de capturas, mira la pantalla a 1440, 1024, 768 y 390 de ancho, en claro y oscuro, y con estados de carga, vacío y error. Agrupa las comprobaciones: arregla todo lo que muestra una mirada antes de volver a mirar. Si no puedes renderizar, dilo y separa lo verificado visualmente de lo inferido del código.

Accesibilidad mínima: todo operable por teclado en orden lógico, foco visible (2px en `--accent`, ≥3:1, sin animación), cada control con nombre accesible, labels visibles encima de los campos (el placeholder no es label), errores bajo su campo con `aria-invalid` y `aria-describedby`, cambios dinámicos anunciados con `role="status"`, headings en orden, objetivos táctiles de 44px.

---

## 12. Copy de la interfaz

- Idioma: el del proyecto (por defecto español), consistente en toda la app. Sentence case.
- Botones con verbo + objeto ("Exportar CSV", "Ejecutar análisis"), no "Enviar", "OK" o "Sí".
- Un término por concepto en toda la app (si es "conjunto de datos", no alternes con "dataset" y "tabla").
- Destructivas: nombra el objeto y la consecuencia; mejor deshacer que confirmar.
- Sin palabras de relleno: potenciar, desbloquear, sin fricción, robusto, de vanguardia, revolucionario, transformar, "lleva tu X al siguiente nivel". Sustitúyelas por el dato.
- Sin "Esta sección muestra…", sin exclamaciones en el cuerpo, sin cifras inventadas.
- Mensajes completos y traducibles, no fragmentos concatenados; variables estructuradas.

---

## 13. Reporte al terminar

Breve, en este orden:

1. Qué se hizo y en qué archivos.
2. Verificación: resultado de `tsc`, `build`, lint y detector; qué se vio renderizado y a qué tamaños; qué no se pudo verificar.
3. Peores casos probados y qué queda como decisión del usuario.
4. Dependencias añadidas (con versión y motivo) o "ninguna".
5. Supuestos que hiciste.

Si durante la sesión el usuario corrigió decisiones de diseño, propón al final convertirlas en reglas de `DESIGN.md` (Emil `learn-taste`): regla de clase de componente, con valores y tokens concretos, con su porqué en palabras del usuario. Propón y espera aprobación; nunca inventes el porqué.

---

## Créditos

Contenido destilado y adaptado de:

- **Impeccable** v4.10.0 · Paul Bakaus · Apache 2.0 · https://github.com/pbakaus/impeccable
- **Skills for Designers and Engineers** · Emil Kowalski · MIT · https://github.com/emilkowalski/skills
- **Taste Skill** v2.5.1 (y taste-skill-classics v1) · Leonxlnx · MIT · https://github.com/Leonxlnx/taste-skill
- API de Recharts verificada contra el código fuente del tag v3.10.1 · MIT · https://github.com/recharts/recharts
