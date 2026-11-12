// Pantalla de búsqueda del despacho por PLC (RF-03).
import { useState } from 'react'
import type { Despacho } from '../tipos'
import { clavePlc } from '../logica/despachos'
import { Aviso, Boton } from './comunes'

interface Props {
  nombreArchivo: string
  despachos: Despacho[]
  advertencias: string[]
  /** PLCs (clave normalizada) que ya se auditaron en esta sesión. */
  auditadas: Set<string>
  /** Auditorías terminadas y grabadas en la sesión. */
  terminadas: number
  /** Devuelve true si encontró el despacho (la app cambia de pantalla). */
  onBuscar: (consulta: string) => boolean
  onDescargarInforme: () => void
  onCambiarArchivo: () => void
}

export default function PantallaBusqueda(props: Props) {
  const [consulta, setConsulta] = useState('')
  const [noEncontrado, setNoEncontrado] = useState(false)

  function buscar(texto: string) {
    if (texto.trim() === '') return
    setNoEncontrado(!props.onBuscar(texto))
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-12 pt-8">
      <p className="text-xs text-zinc-500">
        <span className="font-mono">{props.nombreArchivo}</span> · {props.despachos.length} despachos
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Buscar despacho</h1>

      <form
        className="mt-5"
        onSubmit={(evento) => {
          evento.preventDefault()
          buscar(consulta)
        }}
      >
        <label htmlFor="consulta-plc" className="block text-sm font-medium text-zinc-700">
          PLC del despacho
        </label>
        <select
          id="consulta-plc"
          value={consulta}
          onChange={(evento) => {
            setConsulta(evento.target.value)
            setNoEncontrado(false)
          }}
          autoFocus
          className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 font-mono text-base
            focus-visible:outline-2 focus-visible:outline-slate-900"
        >
          <option value="">Selecciona un PLC…</option>
          {props.despachos.map((despacho) => (
            <option key={despacho.plc} value={despacho.plc}>
              {despacho.plc}
              {despacho.ruta !== '' ? ` · ${despacho.ruta}` : ''}
              {props.auditadas.has(clavePlc(despacho.plc)) ? ' · auditada' : ''}
            </option>
          ))}
        </select>
        <Boton type="submit" className="mt-3 w-full" disabled={consulta === ''}>
          Buscar
        </Boton>
      </form>

      {/* Resultado de la búsqueda: mensaje claro cuando no hay coincidencias. */}
      <p aria-live="polite" className="mt-3">
        {noEncontrado && (
          <Aviso tipo="error">
            No se encontró ningún despacho con el PLC «{consulta.trim()}». Revisa que esté escrito
            igual que en el archivo.
          </Aviso>
        )}
      </p>

      {/* Informe de cierre: se habilita en cuanto hay auditorías grabadas. */}
      {props.terminadas > 0 && (
        <Boton variante="exito" onClick={props.onDescargarInforme} className="mt-7 w-full">
          Descargar informe ({props.terminadas === 1 ? '1 auditoría' : `${props.terminadas} auditorías`})
        </Boton>
      )}

      {props.advertencias.length > 0 && (
        <details className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <summary className="cursor-pointer font-semibold">
            {props.advertencias.length} avisos del archivo
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {props.advertencias.map((aviso, indice) => (
              <li key={indice}>{aviso}</li>
            ))}
          </ul>
        </details>
      )}

      <button
        type="button"
        onClick={props.onCambiarArchivo}
        className="mt-8 text-sm font-semibold text-slate-900 underline
          focus-visible:outline-2 focus-visible:outline-slate-900"
      >
        Usar otro archivo
      </button>
    </main>
  )
}
