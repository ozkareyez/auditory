// Pantalla de confirmación: al encontrar el PLC muestra las cifras de
// control (facturas, líneas, unidades y peso) para cotejarlas con el
// documento impreso; solo cuando coinciden se puede iniciar la auditoría.
// Un PLC ya auditado con este archivo no se puede volver a auditar.
import { useState } from 'react'
import type { Despacho } from '../tipos'
import { agruparPorUm } from '../logica/auditoria'
import { consolidarLineas } from '../logica/despachos'
import { Boton, EncabezadoDespacho } from './comunes'

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
      <EncabezadoDespacho despacho={despacho} mostrarNota>
        {auditada && (
          <p className="flex items-center gap-2 text-sm font-semibold text-verde">
            <span aria-hidden="true" className="size-2 rounded-full bg-verde" />
            Ya auditada en esta sesión
          </p>
        )}
      </EncabezadoDespacho>

      {/* Contenido del despacho consolidado, para verificar que todo quedó cargado. */}
      <section className="mx-auto mt-5 max-w-md px-4" aria-label="Contenido del despacho">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Contenido del despacho</h2>
          <p className="text-xs text-acero">
            {referencias.length === 1 ? '1 referencia' : `${referencias.length} referencias`}
          </p>
        </div>

        <div className="mt-2 space-y-4">
          {grupos.map((grupo) => (
            <section key={grupo.um}>
              <div className="flex items-baseline justify-between border-b-2 border-tinta pb-1">
                <h3 className="text-xs font-bold">{grupo.um}</h3>
                <span className="font-mono text-xs text-acero">{grupo.lineas.length}</span>
              </div>
              <ul className="divide-y divide-linea border-x border-b border-linea bg-hoja">
                {grupo.lineas.map((linea, indice) => (
                  <li key={`${linea.referencia}-${indice}`} className="flex items-baseline gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-bold">{linea.referencia}</p>
                      <p className="mt-0.5 truncate text-sm text-acero">{linea.descripcion}</p>
                    </div>
                    <p className="shrink-0 text-lg font-black tabular-nums">{linea.cantidadEsperada}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      {/* Barra de acciones fija: cotejar y, si coincide, iniciar. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-tinta bg-papel/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 pb-[calc(0.75rem+var(--area-segura-inferior))] pt-3">
          {auditada ? (
            <p className="flex min-h-11 items-center text-sm font-medium text-acero">
              Este PLC ya se auditó con este archivo; no se puede volver a auditar.
            </p>
          ) : (
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={coincide}
                onChange={(evento) => setCoincide(evento.target.checked)}
                className="size-5"
              />
              Los totales coinciden con el PLC impreso
            </label>
          )}
          <div className="mt-2.5 flex gap-3">
            <Boton variante="secundario" onClick={onVolver} className="flex-1">
              Volver
            </Boton>
            <Boton variante="senal" onClick={onIniciar} disabled={!coincide || auditada} className="flex-[2]">
              Iniciar auditoría
            </Boton>
          </div>
        </div>
      </div>
    </div>
  )
}
