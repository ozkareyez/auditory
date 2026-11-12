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
    'min-h-11 w-full rounded-sm border-2 border-linea bg-papel px-2 text-base focus-visible:outline-2 focus-visible:outline-tinta'

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-6">
      <p className="text-xs font-medium text-acero">Archivo cargado</p>
      <p className="mt-0.5 truncate font-mono text-xs text-acero">{props.nombreArchivo}</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Confirma las columnas</h1>
      <p className="mt-1 text-sm text-acero">
        Indica qué columna del archivo corresponde a cada dato del despacho.
      </p>

      {props.hojas.length > 1 && (
        <label className="mt-5 block text-sm font-semibold">
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

      <div className="mt-5 divide-y divide-linea border-2 border-tinta bg-hoja">
        {CAMPOS.map((campo) => {
          const obligatorio = CAMPOS_REQUERIDOS.includes(campo)
          return (
            <label key={campo} className="block p-3 text-sm">
              <span className="font-semibold">
                {NOMBRE_CAMPO[campo]}
                {obligatorio && <span className="text-rojo"> *</span>}
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
      </div>
      <p className="mt-2 text-xs text-acero">Los campos con * son obligatorios; el resto es opcional.</p>

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
          <h2 className="text-sm font-semibold">Vista previa de «{hoja.nombre}»</h2>
          <div className="mt-2 overflow-x-auto border border-linea bg-hoja">
            <table className="w-full min-w-[30rem] text-left text-xs">
              <thead>
                <tr className="border-b border-linea bg-papel">
                  {encabezados.map((encabezado, indice) => (
                    <th key={indice} className="px-2 py-2 font-semibold text-tinta">
                      {encabezado === '' ? `(Columna ${indice + 1})` : encabezado}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vistaPrevia.map((fila, indiceFila) => (
                  <tr key={indiceFila} className="border-b border-linea last:border-0">
                    {filaCompleta(fila).map((celda, indice) => (
                      <td key={indice} className="px-2 py-1.5 text-tinta">
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
        <Boton
          variante="senal"
          onClick={props.onConfirmar}
          disabled={props.faltan.length > 0}
          className="flex-[2]"
        >
          Confirmar columnas
        </Boton>
      </div>
    </main>
  )
}
