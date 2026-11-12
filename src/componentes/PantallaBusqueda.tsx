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
    <main className="mx-auto max-w-md px-4 pb-12 pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-acero">Archivo cargado</p>
        <p className="min-w-0 truncate font-mono text-xs text-acero">{props.nombreArchivo}</p>
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Buscar despacho</h1>
      <p className="mt-1 text-sm text-acero">
        {props.despachos.length === 1
          ? '1 despacho listo para auditar.'
          : `${props.despachos.length} despachos listos para auditar.`}
      </p>

      <form
        className="mt-6 border-2 border-tinta bg-hoja p-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          buscar(consulta)
        }}
      >
        <label htmlFor="consulta-plc" className="block text-sm font-semibold">
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
          className="mt-1.5 min-h-12 w-full rounded-sm border-2 border-linea bg-papel px-3 font-mono text-base
            focus-visible:outline-2 focus-visible:outline-tinta"
        >
          <option value="">Selecciona un PLC…</option>
          {props.despachos.map((despacho) => {
            const auditada = props.auditadas.has(clavePlc(despacho.plc))
            return (
              <option key={despacho.plc} value={despacho.plc}>
                {despacho.plc}
                {despacho.ruta !== '' ? ` (${despacho.ruta})` : ''}
                {auditada ? ' (auditada)' : ''}
              </option>
            )
          })}
        </select>
        <Boton type="submit" variante="senal" className="mt-3 w-full" disabled={consulta === ''}>
          Buscar
        </Boton>
      </form>

      {/* Resultado de la búsqueda: mensaje claro cuando no hay coincidencias. */}
      <div aria-live="polite" className="mt-3">
        {noEncontrado && (
          <Aviso tipo="error">
            No se encontró ningún despacho con el PLC «{consulta.trim()}». Revisa que esté escrito
            igual que en el archivo.
          </Aviso>
        )}
      </div>

      {/* Informe de cierre: se habilita en cuanto hay auditorías grabadas. */}
      {props.terminadas > 0 && (
        <Boton variante="exito" onClick={props.onDescargarInforme} className="mt-7 w-full">
          Descargar informe ({props.terminadas === 1 ? '1 auditoría' : `${props.terminadas} auditorías`})
        </Boton>
      )}

      {props.advertencias.length > 0 && (
        <details className="mt-7 border-l-4 border-l-senal bg-senal-claro p-3 text-sm text-tinta">
          <summary className="-mx-3 -mt-3 cursor-pointer px-3 py-3 font-semibold">
            {props.advertencias.length === 1 ? '1 aviso' : `${props.advertencias.length} avisos`} del archivo
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
        className="mt-8 min-h-11 text-sm font-semibold text-tinta underline decoration-2 underline-offset-4
          focus-visible:outline-2 focus-visible:outline-tinta"
      >
        Usar otro archivo
      </button>
    </main>
  )
}
