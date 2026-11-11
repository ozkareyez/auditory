// Pantalla de resumen: completo / faltantes / reversión / excedentes (RF-07).
import type { Despacho, LineaAuditoria } from '../tipos'
import { calcularResumen, diferenciaDeLinea } from '../logica/auditoria'
import { calcularTotales } from '../logica/despachos'
import { formatearNumero } from '../logica/numeros'
import { Boton } from './comunes'

interface Props {
  despacho: Despacho
  lineas: LineaAuditoria[]
  onRegresar: () => void
  onNueva: () => void
}

const HOJA = 'mt-2 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white'
const LEYENDA = 'text-xs font-bold uppercase tracking-wider'

export default function PantallaResumen({ despacho, lineas, onRegresar, onNueva }: Props) {
  const resumen = calcularResumen(lineas)
  const completa = resumen.estado === 'completo'
  // Cifras de control del documento, para acompañar el resultado.
  const totales = calcularTotales(despacho)
  const partesDocumento = [
    totales.facturas !== null ? `${totales.facturas} facturas` : null,
    `${resumen.totalLineas} líneas`,
    `${totales.unidades} unidades`,
    totales.peso !== null ? `${formatearNumero(totales.peso)} kg` : null,
  ].filter((parte) => parte !== null)

  return (
    <main className="mx-auto max-w-md px-4 pb-12 pt-8">
      {/* Sello del resultado de la auditoría. */}
      <section
        aria-live="polite"
        className={`rounded-xl border-l-4 p-5 ${
          completa
            ? 'border-l-green-600 bg-green-50 text-green-950'
            : 'border-l-red-600 bg-red-50 text-red-950'
        }`}
      >
        <p className="font-mono text-sm font-bold">{despacho.plc}</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">
          {completa ? 'Auditoría completa' : 'Auditoría con diferencias'}
        </h1>
        {(despacho.ruta !== '' || despacho.placa !== '') && (
          <p className="mt-1 text-sm">
            {[despacho.ruta, despacho.placa].filter((dato) => dato !== '').join(' · ')}
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/70 p-2.5">
            <p className="font-mono text-xl font-bold">{resumen.completas}</p>
            <p className="mt-0.5 text-[11px] font-medium">líneas completas</p>
          </div>
          <div className="rounded-lg bg-white/70 p-2.5">
            <p className="font-mono text-xl font-bold">{resumen.faltantes.length}</p>
            <p className="mt-0.5 text-[11px] font-medium">con faltante</p>
          </div>
          <div className="rounded-lg bg-white/70 p-2.5">
            <p className="font-mono text-xl font-bold">{resumen.revisadas}</p>
            <p className="mt-0.5 text-[11px] font-medium">de {resumen.totalLineas} revisadas</p>
          </div>
        </div>

        {/* Totales con los que se cotejó el documento cargado. */}
        <p className="mt-3 text-xs">Documento: {partesDocumento.join(' · ')}</p>
      </section>

      {resumen.faltantes.length > 0 && (
        <section className="mt-6">
          <h2 className={`${LEYENDA} text-red-700`}>Faltantes · {resumen.faltantes.length}</h2>
          <ul className={HOJA}>
            {resumen.faltantes.map((linea, indice) => (
              <li key={`${linea.referencia}-${indice}`} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-sm font-bold">{linea.referencia}</p>
                  <p className="font-mono text-sm font-bold text-red-700">
                    Faltan {diferenciaDeLinea(linea)}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-zinc-700">{linea.descripcion}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Esperado {linea.cantidadEsperada} · verificado {linea.cantidadVerificada}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resumen.reversiones.length > 0 && (
        <section className="mt-6">
          <h2 className={`${LEYENDA} text-amber-700`}>Reversión · {resumen.reversiones.length}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Faltantes que el auditor marcó como reversión; no cuentan como error de despacho.
          </p>
          <ul className={HOJA}>
            {resumen.reversiones.map((linea, indice) => (
              <li key={`${linea.referencia}-${indice}`} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-sm font-bold">{linea.referencia}</p>
                  <p className="font-mono text-sm font-bold text-amber-800">
                    {linea.cantidadVerificada === 0
                      ? `Reversión total de ${diferenciaDeLinea(linea)}`
                      : `Reversión de ${diferenciaDeLinea(linea)}`}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-zinc-700">{linea.descripcion}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Esperado {linea.cantidadEsperada} · verificado {linea.cantidadVerificada}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resumen.excedentes.length > 0 && (
        <section className="mt-6">
          <h2 className={`${LEYENDA} text-amber-700`}>Con excedente · {resumen.excedentes.length}</h2>
          <ul className={HOJA}>
            {resumen.excedentes.map((linea, indice) => (
              <li key={`${linea.referencia}-${indice}`} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-sm font-bold">{linea.referencia}</p>
                  <p className="font-mono text-sm font-bold text-amber-800">
                    Sobran {-diferenciaDeLinea(linea)}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-zinc-700">{linea.descripcion}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Esperado {linea.cantidadEsperada} · verificado {linea.cantidadVerificada}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className={`${LEYENDA} text-zinc-500`}>Sobrantes</h2>
        {resumen.sobrantes.length === 0 ? (
          <p className="mt-2 rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-600">
            Ninguno: todo lo contado pertenece al despacho.
          </p>
        ) : (
          <ul className={HOJA}>
            {resumen.sobrantes.map((sobrante, indice) => (
              <li key={`${sobrante.codigo}-${indice}`} className="p-4">
                <p className="font-mono text-sm font-bold">{sobrante.codigo}</p>
                <p className="mt-0.5 text-sm text-zinc-700">
                  {sobrante.descripcion} · {sobrante.cantidad} unidades
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-7 flex flex-col gap-3">
        <Boton variante={completa ? 'secundario' : 'primario'} onClick={onRegresar}>
          Regresar y corregir
        </Boton>
        <Boton variante={completa ? 'primario' : 'secundario'} onClick={onNueva}>
          Nueva auditoría
        </Boton>
      </div>
    </main>
  )
}
