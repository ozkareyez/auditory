// Pantalla de confirmación: al encontrar el PLC muestra las cifras de
// control (facturas, líneas, unidades y peso) para cotejarlas con el
// documento impreso; solo cuando coinciden se puede iniciar la auditoría.
// Un PLC ya auditado con este archivo no se puede volver a auditar.
import { useState } from 'react'
import type { Despacho } from '../tipos'
import { agruparPorUm } from '../logica/auditoria'
import { consolidarLineas } from '../logica/despachos'
import { Boton, TotalesDocumento } from './comunes'

interface Props {
  despacho: Despacho
  /** true si este PLC ya se auditó en la sesión actual. */
  auditada: boolean
  onIniciar: () => void
  onVolver: () => void
}

export default function PantallaConfirmacion({ despacho, auditada, onIniciar, onVolver }: Props) {
  // El botón de iniciar se habilita cuando el auditor confirma que los
  // totales del archivo coinciden con los del PLC impreso.
  const [coincide, setCoincide] = useState(false)
  // La mercancía se muestra consolidada por referencia y separada por UM.
  const referencias = consolidarLineas(despacho.lineas)
  const grupos = agruparPorUm(referencias)

  return (
    <div className="min-h-dvh pb-36">
      {/* Encabezado tipo remesa con las cifras de control del documento. */}
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-md px-4 pb-5 pt-6">
          <h1 className="font-mono text-2xl font-bold tracking-tight">{despacho.plc}</h1>
          {(despacho.ruta !== '' || despacho.placa !== '') && (
            <p className="mt-1 text-sm text-slate-300">
              {[despacho.ruta, despacho.placa].filter((dato) => dato !== '').join(' · ')}
            </p>
          )}
          {auditada && (
            <p className="mt-3">
              <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-bold text-green-300">
                Ya auditada en esta sesión
              </span>
            </p>
          )}
          <div className="mt-5">
            <TotalesDocumento despacho={despacho} />
          </div>
        </div>
      </header>

      {/* Contenido del despacho consolidado, para verificar que todo quedó cargado. */}
      <section className="mx-auto mt-5 max-w-md px-4" aria-label="Contenido del despacho">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Contenido · {referencias.length} referencias
        </h2>
        <div className="mt-2 space-y-4">
          {grupos.map((grupo) => (
            <section key={grupo.um}>
              <h3 className="mb-1.5 flex items-baseline justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                <span>{grupo.um}</span>
                <span className="font-mono">{grupo.lineas.length}</span>
              </h3>
              <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                {grupo.lineas.map((linea, indice) => (
                  <li key={`${linea.referencia}-${indice}`} className="flex items-baseline gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-bold text-slate-900">{linea.referencia}</p>
                      <p className="mt-0.5 truncate text-sm text-zinc-700">{linea.descripcion}</p>
                    </div>
                    <p className="shrink-0 font-mono text-lg font-bold">{linea.cantidadEsperada}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      {/* Barra de acciones fija: cotejar y, si coincide, iniciar. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 pb-[calc(0.75rem+var(--area-segura-inferior))] pt-3">
          {auditada ? (
            <p className="flex min-h-11 items-center text-sm font-medium text-zinc-700">
              Este PLC ya se auditó con este archivo; no se puede volver a auditar.
            </p>
          ) : (
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={coincide}
                onChange={(evento) => setCoincide(evento.target.checked)}
                className="size-5 accent-slate-900"
              />
              Los totales coinciden con el PLC impreso
            </label>
          )}
          <div className="mt-2.5 flex gap-3">
            <Boton variante="secundario" onClick={onVolver} className="flex-1">
              Volver
            </Boton>
            <Boton onClick={onIniciar} disabled={!coincide || auditada} className="flex-[2]">
              Iniciar auditoría
            </Boton>
          </div>
        </div>
      </div>
    </div>
  )
}
