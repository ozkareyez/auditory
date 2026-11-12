// Elementos compartidos entre pantallas.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Despacho, EstadoLinea } from '../tipos'
import { calcularTotales, consolidarLineas } from '../logica/despachos'
import { formatearNumero } from '../logica/numeros'

type VarianteBoton = 'primario' | 'senal' | 'secundario' | 'exito'

const ESTILO_BOTON: Record<VarianteBoton, string> = {
  primario: 'bg-tinta text-papel active:bg-black disabled:opacity-40',
  senal: 'bg-senal text-tinta active:bg-senal-oscuro disabled:opacity-40',
  secundario: 'border-2 border-tinta bg-hoja text-tinta active:bg-papel',
  exito: 'bg-verde text-hoja active:brightness-90 disabled:opacity-40',
}

/**
 * Botón de la app: 48 px de alto para operar con una mano. primario = tinta,
 * senal = amarillo de seguridad para la acción principal, secundario = volver,
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
      className={`min-h-12 rounded-sm px-4 text-base font-bold tracking-tight
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta
        ${ESTILO_BOTON[variante]} ${className}`}
    />
  )
}

type TipoAviso = 'error' | 'atencion' | 'info'

const ESTILOS_AVISO: Record<TipoAviso, string> = {
  error: 'border-l-rojo bg-rojo-claro text-tinta',
  atencion: 'border-l-senal bg-senal-claro text-tinta',
  info: 'border-l-acero bg-papel text-tinta',
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
      className={`rounded-sm border-l-4 p-3 text-sm leading-snug ${ESTILOS_AVISO[tipo]}`}
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
  pendiente: 'border-senal-oscuro/50 bg-senal-claro text-tinta',
  completo: 'border-verde/30 bg-verde-claro text-verde',
  diferencia: 'border-rojo/30 bg-rojo-claro text-rojo',
}

const PUNTO_ESTADO: Record<EstadoLinea, string> = {
  pendiente: 'bg-senal-oscuro',
  completo: 'bg-verde',
  diferencia: 'bg-rojo',
}

/** Etiqueta con el estado de una línea, siempre con texto (RF-04). */
export function InsigniaEstado({ estado }: { estado: EstadoLinea }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold ${ESTILO_ESTADO[estado]}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${PUNTO_ESTADO[estado]}`} />
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}

/**
 * Cifras de control del documento (facturas, referencias consolidadas,
 * unidades y peso) para cotejar el archivo cargado contra el PLC impreso.
 * Se dibujan como la tira de totales de una hoja de despacho.
 */
export function TotalesDocumento({
  despacho,
  mostrarNota = false,
}: {
  despacho: Despacho
  mostrarNota?: boolean
}) {
  const totales = calcularTotales(despacho)
  const referencias = consolidarLineas(despacho.lineas).length
  const tiles: { valor: string; etiqueta: string }[] = []
  if (totales.facturas !== null) tiles.push({ valor: String(totales.facturas), etiqueta: 'facturas' })
  tiles.push({ valor: String(referencias), etiqueta: 'referencias' })
  tiles.push({ valor: String(totales.unidades), etiqueta: 'unidades' })
  if (totales.peso !== null) tiles.push({ valor: formatearNumero(totales.peso), etiqueta: 'kg' })

  return (
    <div>
      <div
        className="grid divide-x divide-linea"
        style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Totales del documento"
      >
        {tiles.map((tile) => (
          <div key={tile.etiqueta} className="px-1 py-2.5 text-center">
            <p className="text-lg font-black leading-none tracking-tight tabular-nums">{tile.valor}</p>
            <p className="mt-1 text-[11px] font-medium text-acero">{tile.etiqueta}</p>
          </div>
        ))}
      </div>
      {totales.lineasSinPeso > 0 && (
        <p className="mt-2 text-xs font-medium text-rojo">
          {totales.lineasSinPeso === 1
            ? '1 línea trae un peso que no se pudo sumar.'
            : `${totales.lineasSinPeso} líneas traen un peso que no se pudo sumar.`}
        </p>
      )}
      {mostrarNota && (
        <p className="mt-2 text-xs text-acero">
          Coteja estos totales con el PLC impreso antes de empezar a contar.
        </p>
      )}
    </div>
  )
}

/**
 * Cabecera tipo etiqueta de embarque: PLC, ruta/placa y totales del documento.
 * El remate superior es la cinta de precaución, el único guiño gráfico.
 */
export function EncabezadoDespacho({
  despacho,
  mostrarNota = false,
  children,
}: {
  despacho: Despacho
  mostrarNota?: boolean
  children?: ReactNode
}) {
  const ruta = despacho.ruta.trim()
  const placa = despacho.placa.trim()

  return (
    <header>
      <div className="cinta-precaucion h-1.5" />
      <div className="mx-auto max-w-md px-4 pb-4 pt-4">
        <div className="border-2 border-tinta bg-hoja">
          <div className="grid grid-cols-[1.3fr_1fr] divide-x divide-linea border-b border-linea">
            <div className="min-w-0 px-3 py-2">
              <p className="text-[11px] font-medium text-acero">PLC</p>
              <p className="truncate font-mono text-lg font-black tracking-tight">{despacho.plc}</p>
            </div>
            <div className="min-w-0 px-3 py-2">
              <p className="text-[11px] font-medium text-acero">Ruta / placa</p>
              {ruta !== '' && (
                <p className="truncate text-xs font-semibold leading-snug">{ruta}</p>
              )}
              {placa !== '' && (
                <p className="mt-0.5 truncate font-mono text-sm font-bold leading-snug">{placa}</p>
              )}
              {ruta === '' && placa === '' && <p className="text-sm font-semibold">Sin dato</p>}
            </div>
          </div>
          <div className="px-3 py-2">
            <TotalesDocumento despacho={despacho} mostrarNota={mostrarNota} />
          </div>
          {Boolean(children) && <div className="border-t border-linea px-3 py-2.5">{children}</div>}
        </div>
      </div>
    </header>
  )
}
