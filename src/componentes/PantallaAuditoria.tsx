// Pantalla de auditoría: revisar línea por línea con conteo manual (RF-04, RF-06).
import { useEffect, useMemo, useState } from 'react'
import type { Despacho, LineaAuditoria } from '../tipos'
import { agruparPorUm, estadoDeLinea, diferenciaDeLinea, normalizarUm } from '../logica/auditoria'
import { coincideBusquedaManual, destinoEscaneo } from '../logica/cruceCodigo'
import Escaner from './Escaner'
import { Aviso, Boton, EncabezadoDespacho, InsigniaEstado } from './comunes'

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
  // Línea completa que el auditor reabrió explícitamente para corregir.
  const [corrigiendo, setCorrigiendo] = useState<number | null>(null)

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
      // Una línea completa está bloqueada: el escáner no debe sumarle un
      // sobrante por accidente. Se reabre con «Corregir» si hace falta.
      if (estadoDeLinea(linea) === 'completo' && corrigiendo !== destino.indice) {
        setTextoBusqueda(linea.referencia)
        setSoloPendientes(false)
        setResaltada(destino.indice)
        setAvisoEscaneo('Esa referencia ya está completa. Usa «Corregir» si hay una diferencia.')
        return
      }
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

  // Las líneas visibles se separan por UM y se ordenan alfabéticamente.
  const grupos = useMemo(
    () => agruparPorUm(visibles.map(({ linea, indice }) => ({ ...linea, indice }))),
    [visibles],
  )

  // UMs del despacho completo, para saltar a una unidad de medida sin escribir.
  const ums = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const linea of lineas) {
      const um = linea.um.trim()
      if (um === '') continue
      conteo.set(um, (conteo.get(um) ?? 0) + 1)
    }
    return [...conteo.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
      .map(([um, total]) => ({ um, total }))
  }, [lineas])

  /** Filtra la lista por una UM; si ya estaba activa, quita el filtro. */
  function alElegirUm(um: string) {
    const activa = textoBusqueda !== '' && normalizarUm(textoBusqueda) === normalizarUm(um)
    setTextoBusqueda(activa ? '' : um)
    if (!activa) setSoloPendientes(false)
    setAvisoEscaneo(null)
    setResaltada(null)
  }

  return (
    <div className="min-h-dvh pb-32">
      <EncabezadoDespacho despacho={despacho}>
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold">
              {revisadas} de {total} líneas revisadas
            </span>
            <span className="font-mono text-xs text-acero">{porcentaje}%</span>
          </div>
          <div
            className="mt-2 grid grid-cols-10 gap-1"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
            aria-valuetext={`${revisadas} de ${total} líneas revisadas`}
            aria-label="Avance de la auditoría"
          >
            {Array.from({ length: 10 }, (_, indice) => {
              const lleno = porcentaje >= (indice + 1) * 10
              return (
                <span
                  key={indice}
                  className={`h-2 ${lleno ? (porcentaje === 100 ? 'bg-verde' : 'bg-tinta') : 'bg-tinta/15'}`}
                />
              )
            })}
          </div>
        </div>
      </EncabezadoDespacho>

      {/* Búsqueda y filtro de líneas (RF-04 y RF-06). */}
      <section className="mx-auto max-w-md px-4 pt-4">
        <div className="border-2 border-tinta bg-hoja p-3">
          <label htmlFor="buscar-producto" className="block text-sm font-semibold">
            Buscar producto o UM
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
              placeholder="Descripción, referencia, UM o código"
              autoComplete="off"
              className="min-h-12 min-w-0 flex-1 rounded-sm border-2 border-linea bg-papel px-3 text-base
                focus-visible:outline-2 focus-visible:outline-tinta"
            />
            <button
              type="button"
              aria-label="Escanear código de barras con la cámara"
              onClick={() => {
                setEscaneando(true)
                setAvisoEscaneo(null)
              }}
              className="flex size-12 shrink-0 items-center justify-center rounded-sm border-2 border-tinta bg-senal text-tinta
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta active:bg-senal-oscuro"
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
          <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(evento) => setSoloPendientes(evento.target.checked)}
              className="size-5"
            />
            Ver solo pendientes
          </label>
        </div>

        {/* Acceso rápido a cada unidad de medida (cajas, bultos, unidades…). */}
        {ums.length > 1 && (
          <div
            className="mt-4 flex gap-1 overflow-x-auto border-b-2 border-tinta"
            aria-label="Unidades de medida"
          >
            <button
              type="button"
              aria-pressed={textoBusqueda === ''}
              onClick={() => {
                setTextoBusqueda('')
                setAvisoEscaneo(null)
                setResaltada(null)
              }}
              className={`min-h-11 shrink-0 border-b-2 px-3 py-2 text-sm font-semibold
                focus-visible:outline-2 focus-visible:outline-tinta ${
                  textoBusqueda === ''
                    ? 'border-tinta text-tinta'
                    : 'border-transparent text-acero'
                }`}
            >
              Todas
            </button>
            {ums.map(({ um, total: totalUm }) => {
              const activa =
                textoBusqueda !== '' && normalizarUm(textoBusqueda) === normalizarUm(um)
              return (
                <button
                  key={um}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => alElegirUm(um)}
                  className={`flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold
                    focus-visible:outline-2 focus-visible:outline-tinta ${
                      activa ? 'border-tinta text-tinta' : 'border-transparent text-acero'
                    }`}
                >
                  {um}
                  <span className="font-mono text-xs font-normal">{totalUm}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Líneas del despacho, como una sola hoja de conteo. */}
      <section className="mx-auto mt-4 max-w-md px-4" aria-label="Líneas del despacho">
        {visibles.length === 0 ? (
          <p className="border-2 border-linea bg-hoja px-4 py-5 text-sm text-acero">
            No hay líneas que coincidan con la búsqueda o el filtro.
          </p>
        ) : (
          <div className="space-y-5">
            {grupos.map((grupo) => (
              <section key={grupo.um} aria-label={`Unidad de medida ${grupo.um}`}>
                <div className="flex items-baseline justify-between border-b-2 border-tinta pb-1">
                  <h2 className="text-xs font-bold">{grupo.um}</h2>
                  <span className="font-mono text-xs text-acero">{grupo.lineas.length}</span>
                </div>
                <ul className="divide-y divide-linea border-x border-b border-linea bg-hoja">
                  {grupo.lineas.map((linea) => {
                    const indice = linea.indice
                    const estado = estadoDeLinea(linea)
                    const diferencia = diferenciaDeLinea(linea)
                    // Al llegar a la cantidad esperada la card se bloquea;
                    // solo se reabre con «Corregir».
                    const bloqueada = estado === 'completo' && corrigiendo !== indice
                    return (
                      <li
                        key={`${linea.referencia}-${indice}`}
                        id={`linea-${indice}`}
                        className={`p-3.5 ${
                          estado === 'completo' ? 'border-l-4 border-l-verde' : ''
                        } ${
                          resaltada === indice
                            ? 'bg-senal-claro ring-2 ring-inset ring-tinta'
                            : bloqueada
                              ? 'bg-verde-claro/45'
                              : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-bold">{linea.referencia}</p>
                            <p className="mt-0.5 text-[15px] leading-snug">{linea.descripcion}</p>
                          </div>
                          {linea.reversion && estado !== 'completo' ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-senal-oscuro/50 bg-senal-claro px-1.5 py-0.5 text-[11px] font-semibold text-tinta">
                              <span aria-hidden="true" className="size-1.5 rounded-full bg-senal-oscuro" />
                              Reversión
                            </span>
                          ) : (
                            <InsigniaEstado estado={estado} />
                          )}
                        </div>

                        {bloqueada ? (
                          <div className="mt-3 flex items-end justify-between gap-3 border-t border-verde/25 pt-3">
                            <div className="text-sm">
                              <p className="flex items-baseline gap-1.5">
                                <span className="text-acero">Esperado</span>
                                <span className="text-base font-black tabular-nums">
                                  {linea.cantidadEsperada}
                                </span>
                              </p>
                              {linea.peso !== '' && <p className="mt-0.5 text-acero">Peso {linea.peso}</p>}
                            </div>
                            <div className="text-right">
                              <p className="flex items-center justify-end gap-1.5 text-sm font-bold text-verde">
                                <IconoCheck />
                                {linea.cantidadVerificada} de {linea.cantidadEsperada}
                              </p>
                              <button
                                type="button"
                                onClick={() => setCorrigiendo(indice)}
                                aria-label={`Corregir ${linea.referencia}`}
                                className="mt-1 min-h-11 min-w-11 px-1 text-sm font-semibold text-tinta underline decoration-2 underline-offset-4
                                  focus-visible:outline-2 focus-visible:outline-tinta"
                              >
                                Corregir
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 border-t border-linea pt-3">
                            <div className="flex items-end justify-between gap-3">
                              <div className="text-sm">
                                <p className="flex items-baseline gap-1.5">
                                  <span className="text-acero">Esperado</span>
                                  <span className="text-base font-black tabular-nums">
                                    {linea.cantidadEsperada}
                                  </span>
                                </p>
                                {linea.peso !== '' && (
                                  <p className="mt-0.5 text-acero">Peso {linea.peso}</p>
                                )}
                                {estado === 'diferencia' && (
                                  <p className="mt-1 font-bold text-rojo">
                                    {diferencia > 0 ? `Faltan ${diferencia}` : `Sobran ${-diferencia}`}
                                  </p>
                                )}
                                {/* La reversión se puede marcar aunque no se haya contado
                                    nada: es la reversión total de la línea. */}
                                {diferencia > 0 && (
                                  <label className="mt-1 flex min-h-11 items-center gap-2 text-sm font-medium">
                                    <input
                                      type="checkbox"
                                      checked={linea.reversion}
                                      onChange={(evento) =>
                                        props.onMarcarReversion(indice, evento.target.checked)
                                      }
                                      className="size-5"
                                    />
                                    {linea.cantidadVerificada === 0
                                      ? 'Reversión total'
                                      : 'El faltante es reversión'}
                                  </label>
                                )}
                              </div>
                              <EntradaCantidad
                                valor={linea.cantidadVerificada}
                                onCambiar={(cantidad) => props.onCambiarCantidad(indice, cantidad)}
                              />
                            </div>
                            {estado === 'completo' && (
                              <div className="mt-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setCorrigiendo(null)}
                                  aria-label={`Terminar corrección de ${linea.referencia}`}
                                  className="min-h-11 min-w-11 px-1 text-sm font-semibold text-tinta underline decoration-2 underline-offset-4
                                    focus-visible:outline-2 focus-visible:outline-tinta"
                                >
                                  Listo
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      {/* Escáner de código de barras con la cámara (RF-05). */}
      {escaneando && <Escaner onLeer={alLeer} onCerrar={() => setEscaneando(false)} />}

      {/* Barra de acciones fija, al alcance del pulgar. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-tinta bg-papel/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3 px-4 pb-[calc(0.75rem+var(--area-segura-inferior))] pt-3">
          <Boton variante="secundario" onClick={props.onVolver} className="flex-1">
            Volver
          </Boton>
          <Boton variante="senal" onClick={props.onFinalizar} className="flex-[2]">
            Finalizar auditoría
          </Boton>
        </div>
      </div>
    </div>
  )
}

/** Marca de verificación para las líneas ya completas y bloqueadas. */
function IconoCheck() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
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
      <p className="mb-1 text-[11px] font-medium text-acero">Verificado</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Quitar una unidad"
          onClick={() => onCambiar(Math.max(0, valor - 1))}
          className="size-12 rounded-sm border-2 border-tinta bg-hoja text-2xl font-bold text-tinta
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta active:bg-papel"
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
          className="h-12 w-16 rounded-sm border-2 border-linea bg-hoja text-center font-mono text-lg font-bold
            focus-visible:outline-2 focus-visible:outline-tinta"
        />
        <button
          type="button"
          aria-label="Agregar una unidad"
          onClick={() => onCambiar(valor + 1)}
          className="size-12 rounded-sm border-2 border-tinta bg-senal text-2xl font-bold text-tinta
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta active:bg-senal-oscuro"
        >
          +
        </button>
      </div>
    </div>
  )
}
