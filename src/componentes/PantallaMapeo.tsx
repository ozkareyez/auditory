// Pantalla de mapeo de columnas: confirmar qué columna es cada campo (RF-02).
import type { Campo, Hoja, MapeoColumnas } from '../tipos'
import { CAMPOS, CAMPOS_REQUERIDOS, NOMBRE_CAMPO } from '../logica/mapeoColumnas'
import { Aviso, Boton } from './comunes'

interface Props {
  nombreArchivo: string
  hojas: Hoja[]
  hoja: Hoja
  mapeo: MapeoColumnas
  faltan: Campo[]
  onCambiarHoja: (hoja: Hoja) => void
  onAsignar: (campo: Campo, columna: number | null) => void
  onConfirmar: () => void
  onVolver: () => void
  error: string | null
}

export default function PantallaMapeo(props: Props) {
  const { hoja } = props
  const encabezados = hoja.filas[0] ?? []
  // Primeras filas de datos, para reconocer las columnas a simple vista.
  const vistaPrevia = hoja.filas.slice(1, 6)
  const filaCompleta = (fila: string[]) => encabezados.map((_, indice) => fila[indice] ?? '')

  const clasesSelect =
    'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-base focus-visible:outline-2 focus-visible:outline-slate-900'

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-8">
      <h1 className="text-2xl font-bold tracking-tight">Confirma las columnas</h1>
      <p className="mt-1 text-xs text-zinc-500">
        <span className="font-mono">{props.nombreArchivo}</span>
      </p>

      {props.hojas.length > 1 && (
        <label className="mt-5 block text-sm font-medium text-zinc-700">
          Hoja del archivo
          <select
            value={hoja.nombre}
            onChange={(evento) => {
              const elegida = props.hojas.find((unaHoja) => unaHoja.nombre === evento.target.value)
              if (elegida) props.onCambiarHoja(elegida)
            }}
            className={`mt-1.5 ${clasesSelect}`}
          >
            {props.hojas.map((unaHoja) => (
              <option key={unaHoja.nombre} value={unaHoja.nombre}>
                {unaHoja.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-5 space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        {CAMPOS.map((campo) => {
          const obligatorio = CAMPOS_REQUERIDOS.includes(campo)
          return (
            <label key={campo} className="block text-sm">
              <span className="font-medium text-zinc-800">
                {NOMBRE_CAMPO[campo]}
                {obligatorio && <span className="text-red-700"> *</span>}
              </span>
              <select
                value={props.mapeo[campo] ?? ''}
                onChange={(evento) =>
                  props.onAsignar(campo, evento.target.value === '' ? null : Number(evento.target.value))
                }
                className={`mt-1 ${clasesSelect}`}
              >
                <option value="">— Sin usar —</option>
                {encabezados.map((encabezado, indice) => (
                  <option key={indice} value={indice}>
                    {encabezado === '' ? `(Columna ${indice + 1})` : encabezado}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
        <p className="text-xs text-zinc-500">Los campos con * son obligatorios; el resto es opcional.</p>
      </div>

      {props.faltan.length > 0 && (
        <div className="mt-3">
          <Aviso tipo="atencion" titulo="Faltan columnas obligatorias">
            Asigna una columna para: {props.faltan.map((campo) => NOMBRE_CAMPO[campo]).join(', ')}.
          </Aviso>
        </div>
      )}
      {props.error !== null && (
        <div className="mt-3">
          <Aviso tipo="error">{props.error}</Aviso>
        </div>
      )}

      {vistaPrevia.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Vista previa de «{hoja.nombre}»
          </h2>
          <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[30rem] text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  {encabezados.map((encabezado, indice) => (
                    <th key={indice} className="px-2 py-2 font-mono font-semibold text-zinc-700">
                      {encabezado === '' ? `(Columna ${indice + 1})` : encabezado}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vistaPrevia.map((fila, indiceFila) => (
                  <tr key={indiceFila} className="border-b border-zinc-100 last:border-0">
                    {filaCompleta(fila).map((celda, indice) => (
                      <td key={indice} className="px-2 py-1.5 text-zinc-800">
                        {celda}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" onClick={props.onVolver} className="flex-1">
          Volver
        </Boton>
        <Boton onClick={props.onConfirmar} disabled={props.faltan.length > 0} className="flex-[2]">
          Confirmar columnas
        </Boton>
      </div>
    </main>
  )
}
