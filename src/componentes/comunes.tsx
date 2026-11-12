// Elementos compartidos entre pantallas.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Despacho, EstadoLinea } from '../tipos'
import { calcularTotales, consolidarLineas } from '../logica/despachos'
import { formatearNumero } from '../logica/numeros'

type VarianteBoton = 'primario' | 'secundario' | 'exito'

const ESTILO_BOTON: Record<VarianteBoton, string> = {
  primario: 'bg-slate-900 text-white active:bg-black disabled:opacity-40',
  secundario: 'border border-slate-300 bg-white text-slate-900 active:bg-slate-100',
  exito: 'bg-green-700 text-white active:bg-green-800',
}

/**
 * Botón de la app: tinta sobre papel y 48 px de alto para operar con una
 * mano (RF de usabilidad). primario = avanzar, secundario = volver,
 * exito = cerrar o descargar.
 */
export function Boton({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton }) {
  return (
    <button
      {...props}
      className={`min-h-12 rounded-xl px-4 text-lg font-bold tracking-tight
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900
        ${ESTILO_BOTON[variante]} ${className}`}
    />
  )
}

type TipoAviso = 'error' | 'atencion' | 'info'

const ESTILOS_AVISO: Record<TipoAviso, string> = {
  error: 'border-red-200 bg-red-50 text-red-900',
  atencion: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
}

/**
 * Caja de aviso con texto legible: el mensaje nunca depende solo del color
 * (requisito de accesibilidad del PRD). Se usa para errores de carga y
 * advertencias del archivo.
 */
export function Aviso({ tipo, titulo, children }: { tipo: TipoAviso; titulo?: string; children?: ReactNode }) {
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border p-3 text-sm leading-snug ${ESTILOS_AVISO[tipo]}`}
    >
      {titulo !== undefined && <p className="font-semibold">{titulo}</p>}
      {children}
    </div>
  )
}

const ETIQUETA_ESTADO: Record<EstadoLinea, string> = {
  pendiente: 'Pendiente',
  completo: 'Completo',
  diferencia: 'Diferencia',
}

const ESTILO_ESTADO: Record<EstadoLinea, string> = {
  pendiente: 'bg-amber-100 text-amber-900',
  completo: 'bg-green-100 text-green-900',
  diferencia: 'bg-red-100 text-red-900',
}

/** Etiqueta con el estado de una línea, siempre con texto (RF-04). */
export function InsigniaEstado({ estado }: { estado: EstadoLinea }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${ESTILO_ESTADO[estado]}`}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}

/**
 * Cifras de control del documento (facturas, referencias consolidadas,
 * unidades y peso) para cotejar el archivo cargado contra el PLC impreso.
 * Va sobre el encabezado oscuro de las pantallas.
 */
export function TotalesDocumento({ despacho }: { despacho: Despacho }) {
  const totales = calcularTotales(despacho)
  const referencias = consolidarLineas(despacho.lineas).length
  const tiles: { valor: string; etiqueta: string }[] = []
  if (totales.facturas !== null) tiles.push({ valor: String(totales.facturas), etiqueta: 'facturas' })
  tiles.push({ valor: String(referencias), etiqueta: 'referencias' })
  tiles.push({ valor: String(totales.unidades), etiqueta: 'unidades' })
  if (totales.peso !== null) tiles.push({ valor: formatearNumero(totales.peso), etiqueta: 'kg' })
  const clasesColumnas = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[tiles.length] ?? 'grid-cols-3'

  return (
    <div>
      <div
        className={`grid overflow-hidden rounded-lg bg-white/10 text-center ${clasesColumnas}`}
        role="group"
        aria-label="Totales del documento"
      >
        {tiles.map((tile) => (
          <div key={tile.etiqueta} className="border-l border-white/15 px-1 py-2.5 first:border-l-0">
            <p className="font-mono text-xl font-bold leading-none">{tile.valor}</p>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {tile.etiqueta}
            </p>
          </div>
        ))}
      </div>
      {totales.lineasSinPeso > 0 && (
        <p className="mt-2.5 text-xs text-amber-300">
          {totales.lineasSinPeso === 1
            ? '1 línea trae un peso que no se pudo sumar.'
            : `${totales.lineasSinPeso} líneas traen un peso que no se pudo sumar.`}
        </p>
      )}
      <p className="mt-2.5 text-xs text-slate-400">
        Coteja estos totales con el PLC impreso antes de empezar a contar.
      </p>
    </div>
  )
}
