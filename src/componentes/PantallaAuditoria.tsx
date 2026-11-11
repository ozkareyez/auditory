// Pantalla de auditoría: revisar línea por línea con conteo manual (RF-04, RF-06).
import { useEffect, useMemo, useState } from 'react'
import type { Despacho, LineaAuditoria } from '../tipos'
import { estadoDeLinea, diferenciaDeLinea } from '../logica/auditoria'
import { coincideBusquedaManual, destinoEscaneo } from '../logica/cruceCodigo'
import Escaner from './Escaner'
import { Aviso, Boton, InsigniaEstado, TotalesDocumento } from './comunes'

interface Props {
  despacho: Despacho
  lineas: LineaAuditoria[]
  onCambiarCantidad: (indice: number, cantidad: number) => void
  /** Marca (o desmarca) el faltante de una línea como reversión. */
  onMarcarReversion: (indice: number, reversion: boolean) => void
  onFinalizar: () => void
  onVolver: () => void
}

export default function PantallaAuditoria(props: Props) {
  const { despacho, lineas } = props
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [escaneando, setEscaneando] = useState(false)
  const [avisoEscaneo, setAvisoEscaneo] = useState<string | null>(null)
  const [resaltada, setResaltada] = useState<number | null>(null)

  // La línea recién escaneada se trae al centro de la pantalla.
  useEffect(() => {
    if (resaltada === null) return
    document.getElementById(`linea-${resaltada}`)?.scrollIntoView({ block: 'center' })
  }, [resaltada])

  /**
   * Al leer un código con la cámara: si corresponde a una sola línea le
   * suma 1 al conteo y la resalta; si son varias, filtra la lista para
   * que el auditor escoja cuál contar; si a ninguna, avisa.
   */
  function alLeer(codigo: string) {
    setEscaneando(false)
    const destino = destinoEscaneo(lineas, codigo)
    if (destino.tipo === 'unica') {
      const linea = lineas[destino.indice]
      props.onCambiarCantidad(destino.indice, linea.cantidadVerificada + 1)
      setTextoBusqueda(linea.referencia)
      setSoloPendientes(false)
      setResaltada(destino.indice)
      setAvisoEscaneo(null)
      if (typeof navigator.vibrate === 'function') navigator.vibrate(50)
    } else if (destino.tipo === 'multiple') {
      setTextoBusqueda(codigo)
      setSoloPendientes(false)
      setResaltada(null)
      setAvisoEscaneo(`El código corresponde a ${destino.coincidencias} líneas; escoge cuál contar.`)
    } else {
      setResaltada(null)
      setAvisoEscaneo('El código leído no está en este despacho.')
    }
  }

  const total = lineas.length
  const revisadas = lineas.filter((linea) => estadoDeLinea(linea) !== 'pendiente').length
  const porcentaje = total > 0 ? Math.round((revisadas / total) * 100) : 0

  // Líneas visibles según el filtro de pendientes y el texto buscado.
  const visibles = useMemo(
    () =>
      lineas
        .map((linea, indice) => ({ linea, indice }))
        .filter(
          ({ linea }) =>
            (!soloPendientes || estadoDeLinea(linea) === 'pendiente') &&
            coincideBusquedaManual(linea, textoBusqueda),
        ),
    [lineas, soloPendientes, textoBusqueda],
  )

  return (
    <div className="min-h-dvh pb-32">
      {/* Encabezado tipo remesa: PLC, ruta, placa y avance del conteo. */}
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-md px-4 pb-5 pt-6">
          <h1 className="font-mono text-2xl font-bold tracking-tight">{despacho.plc}</h1>
          {(despacho.ruta !== '' || despacho.placa !== '') && (
            <p className="mt-1 text-sm text-slate-300">
              {[despacho.ruta, despacho.placa].filter((dato) => dato !== '').join(' · ')}
            </p>
          )}

          {/* Totales de control del documento (facturas, líneas, unidades, kg). */}
          <div className="mt-5">
            <TotalesDocumento despacho={despacho} />
          </div>

          <div className="mt-5" aria-label="Avance de la auditoría">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">
                {revisadas} de {total} líneas revisadas
              </span>
              <span className="font-mono text-slate-300">{porcentaje}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-200"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Búsqueda y filtro de líneas (RF-04 y RF-06). */}
      <section className="mx-auto max-w-md px-4 pt-5">
        <label htmlFor="buscar-producto" className="block text-sm font-medium text-zinc-700">
          Buscar producto
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="buscar-producto"
            value={textoBusqueda}
            onChange={(evento) => {
              setTextoBusqueda(evento.target.value)
              setAvisoEscaneo(null)
              setResaltada(null)
            }}
            placeholder="Descripción, referencia o código escaneado"
            autoComplete="off"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-base
              focus-visible:outline-2 focus-visible:outline-slate-900"
          />
          <button
            type="button"
            aria-label="Escanear código de barras con la cámara"
            onClick={() => {
              setEscaneando(true)
              setAvisoEscaneo(null)
            }}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:bg-black"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-6"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </button>
        </div>
        {avisoEscaneo !== null && (
          <div className="mt-3">
            <Aviso tipo="atencion">{avisoEscaneo}</Aviso>
          </div>
        )}
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-800">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(evento) => setSoloPendientes(evento.target.checked)}
            className="size-5 accent-slate-900"
          />
          Ver solo pendientes
        </label>
      </section>

      {/* Líneas del despacho, como una sola hoja de conteo. */}
      <section className="mx-auto mt-4 max-w-md px-4" aria-label="Líneas del despacho">
        {visibles.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-600">
            No hay líneas que coincidan con la búsqueda o el filtro.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {visibles.map(({ linea, indice }) => {
              const estado = estadoDeLinea(linea)
              const diferencia = diferenciaDeLinea(linea)
              return (
                <li
                  key={`${linea.referencia}-${indice}`}
                  id={`linea-${indice}`}
                  className={`p-4 ${resaltada === indice ? 'bg-slate-50 ring-2 ring-inset ring-slate-900/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-slate-900">
                        {linea.referencia}
                        {linea.um !== '' && <span className="font-normal text-zinc-500"> · {linea.um}</span>}
                      </p>
                      <p className="mt-0.5 text-[15px] leading-snug text-zinc-800">{linea.descripcion}</p>
                    </div>
                    {linea.reversion && estado !== 'completo' ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                        Reversión
                      </span>
                    ) : (
                      <InsigniaEstado estado={estado} />
                    )}
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-zinc-100 pt-3">
                    <div className="text-sm">
                      <p>
                        <span className="text-zinc-500">Esperado </span>
                        <span className="font-mono text-base font-bold">{linea.cantidadEsperada}</span>
                      </p>
                      {linea.peso !== '' && <p className="mt-0.5 text-zinc-500">Peso {linea.peso}</p>}
                      {estado === 'diferencia' && (
                        <p className="mt-1 font-bold text-red-700">
                          {diferencia > 0 ? `Faltan ${diferencia}` : `Sobran ${-diferencia}`}
                        </p>
                      )}
                      {/* La reversión se puede marcar aunque no se haya contado
                          nada: es la reversión total de la línea. */}
                      {diferencia > 0 && (
                        <label className="mt-1 flex min-h-11 items-center gap-2 text-sm font-medium text-amber-900">
                          <input
                            type="checkbox"
                            checked={linea.reversion}
                            onChange={(evento) => props.onMarcarReversion(indice, evento.target.checked)}
                            className="size-5 accent-amber-600"
                          />
                          {linea.cantidadVerificada === 0 ? 'Reversión total' : 'El faltante es reversión'}
                        </label>
                      )}
                    </div>
                    <EntradaCantidad
                      valor={linea.cantidadVerificada}
                      onCambiar={(cantidad) => props.onCambiarCantidad(indice, cantidad)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Escáner de código de barras con la cámara (RF-05). */}
      {escaneando && <Escaner onLeer={alLeer} onCerrar={() => setEscaneando(false)} />}

      {/* Barra de acciones fija, al alcance del pulgar. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3 px-4 pb-[calc(0.75rem+var(--area-segura-inferior))] pt-3">
          <Boton variante="secundario" onClick={props.onVolver} className="flex-1">
            Volver
          </Boton>
          <Boton onClick={props.onFinalizar} className="flex-[2]">
            Finalizar auditoría
          </Boton>
        </div>
      </div>
    </div>
  )
}

/**
 * Entrada de cantidad verificada con botones grandes de + y − y escritura
 * directa del número (RF-06). Los botones trabajan con una mano.
 */
function EntradaCantidad({ valor, onCambiar }: { valor: number; onCambiar: (cantidad: number) => void }) {
  const [texto, setTexto] = useState(String(valor))
  const [enfocada, setEnfocada] = useState(false)
  // Último valor externo ya reflejado en el texto del campo.
  const [valorReflejado, setValorReflejado] = useState(valor)

  // Ajuste durante el render: si el valor cambió desde afuera (botones + y −)
  // y el campo no está en edición, se sincroniza el texto.
  if (valor !== valorReflejado) {
    setValorReflejado(valor)
    if (!enfocada) setTexto(String(valor))
  }

  function alEscribir(nuevoTexto: string) {
    setTexto(nuevoTexto)
    if (nuevoTexto.trim() === '') return // el número se define al salir del campo
    const numero = Math.trunc(Number(nuevoTexto))
    if (Number.isFinite(numero)) onCambiar(Math.max(0, numero))
  }

  return (
    <div className="text-right">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Verificado</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Quitar una unidad"
          onClick={() => onCambiar(Math.max(0, valor - 1))}
          className="size-12 rounded-xl border border-slate-300 bg-white text-2xl font-bold text-slate-700
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:bg-slate-100"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          aria-label="Cantidad verificada"
          value={texto}
          onFocus={() => setEnfocada(true)}
          onBlur={() => {
            setEnfocada(false)
            // Si el campo quedó vacío, vuelve a mostrar el valor actual.
            if (texto.trim() === '') setTexto(String(valor))
          }}
          onChange={(evento) => alEscribir(evento.target.value)}
          className="h-12 w-16 rounded-xl border border-slate-300 bg-white text-center font-mono text-lg font-bold
            focus-visible:outline-2 focus-visible:outline-slate-900"
        />
        <button
          type="button"
          aria-label="Agregar una unidad"
          onClick={() => onCambiar(valor + 1)}
          className="size-12 rounded-xl bg-slate-900 text-2xl font-bold text-white
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:bg-black"
        >
          +
        </button>
      </div>
    </div>
  )
}
