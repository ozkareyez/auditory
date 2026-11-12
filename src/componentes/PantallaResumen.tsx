// Pantalla de resumen: completo / faltantes / reversión / excedentes (RF-07).
import type { Despacho, LineaAuditoria } from '../tipos'
import { agruparPorUm, calcularResumen, diferenciaDeLinea } from '../logica/auditoria'
import { calcularTotales } from '../logica/despachos'
import { formatearNumero } from '../logica/numeros'
import { Boton } from './comunes'

interface Props {
  despacho: Despacho
  lineas: LineaAuditoria[]
  onRegresar: () => void
  onNueva: () => void
}

export default function PantallaResumen({ despacho, lineas, onRegresar, onNueva }: Props) {
  const resumen = calcularResumen(lineas)
  const completa = resumen.estado === 'completo'
  // Cifras de control del documento, para acompañar el resultado.
  const totales = calcularTotales(despacho)
  const partesDocumento = [
    totales.facturas !== null ? `${totales.facturas} facturas` : null,
    `${resumen.totalLineas} referencias`,
    `${totales.unidades} unidades`,
    totales.peso !== null ? `${formatearNumero(totales.peso)} kg` : null,
  ].filter((parte) => parte !== null)
  const ubicacion = [despacho.ruta, despacho.placa].filter((dato) => dato !== '')

  return (
    <main className="mx-auto max-w-md px-4 pb-12 pt-6">
      {/* Resultado sobrio, como un sello de inspección sin adornos. */}
      <section aria-live="polite" className="border-2 border-tinta bg-hoja">
        <div className={`h-2 ${completa ? 'bg-verde' : 'bg-rojo'}`} />
        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-sm font-bold">{despacho.plc}</p>
            <p className={`text-xs font-semibold ${completa ? 'text-verde' : 'text-rojo'}`}>
              {completa ? 'Sin diferencias' : 'Con diferencias'}
            </p>
          </div>
          <h1
            className={`mt-1 text-3xl font-black leading-tight tracking-tight ${
              completa ? 'text-verde' : 'text-rojo'
            }`}
          >
            {completa ? 'Auditoría completa' : 'Auditoría con diferencias'}
          </h1>
          {ubicacion.length > 0 && (
            <p className="mt-1 text-sm text-acero">{ubicacion.join(' / ')}</p>
          )}

          <div className="mt-4 grid grid-cols-3 divide-x divide-linea border-y border-linea text-center">
            <div className="px-1 py-2.5">
              <p className="text-xl font-black tabular-nums">{resumen.completas}</p>
              <p className="mt-0.5 text-[11px] font-medium text-acero">completas</p>
            </div>
            <div className="px-1 py-2.5">
              <p className="text-xl font-black tabular-nums">{resumen.faltantes.length}</p>
              <p className="mt-0.5 text-[11px] font-medium text-acero">con faltante</p>
            </div>
            <div className="px-1 py-2.5">
              <p className="text-xl font-black tabular-nums">{resumen.revisadas}</p>
              <p className="mt-0.5 text-[11px] font-medium text-acero">
                de {resumen.totalLineas} revisadas
              </p>
            </div>
          </div>

          {/* Totales con los que se cotejó el documento cargado. */}
          <p className="mt-3 text-xs text-acero">Documento: {partesDocumento.join(', ')}</p>
        </div>
      </section>

      {resumen.faltantes.length > 0 && (
        <section className="mt-6">
          <TituloLista color="bg-rojo" texto="Faltantes" total={resumen.faltantes.length} />
          <ListaPorUm
            lineas={resumen.faltantes}
            color="text-rojo"
            texto={(linea) => `Faltan ${diferenciaDeLinea(linea)}`}
          />
        </section>
      )}

      {resumen.reversiones.length > 0 && (
        <section className="mt-6">
          <TituloLista color="bg-senal" texto="Reversión" total={resumen.reversiones.length} />
          <p className="mt-1 text-xs text-acero">
            Faltantes que el auditor marcó como reversión; no cuentan como error de despacho.
          </p>
          <ListaPorUm
            lineas={resumen.reversiones}
            color="text-tinta"
            texto={(linea) =>
              linea.cantidadVerificada === 0
                ? `Reversión total de ${diferenciaDeLinea(linea)}`
                : `Reversión de ${diferenciaDeLinea(linea)}`
            }
          />
        </section>
      )}

      {resumen.excedentes.length > 0 && (
        <section className="mt-6">
          <TituloLista color="bg-senal" texto="Con excedente" total={resumen.excedentes.length} />
          <ListaPorUm
            lineas={resumen.excedentes}
            color="text-tinta"
            texto={(linea) => `Sobran ${-diferenciaDeLinea(linea)}`}
          />
        </section>
      )}

      <section className="mt-6">
        <TituloLista color="bg-acero" texto="Sobrantes" total={resumen.sobrantes.length} />
        {resumen.sobrantes.length === 0 ? (
          <p className="mt-2 border-2 border-linea bg-hoja px-4 py-4 text-sm text-acero">
            Ninguno: todo lo contado pertenece al despacho.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-linea border-x border-b border-linea bg-hoja">
            {resumen.sobrantes.map((sobrante, indice) => (
              <li key={`${sobrante.codigo}-${indice}`} className="p-3">
                <p className="font-mono text-sm font-bold">{sobrante.codigo}</p>
                <p className="mt-0.5 text-sm">
                  {sobrante.descripcion}, {sobrante.cantidad} unidades
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-7 flex flex-col gap-3">
        <Boton variante={completa ? 'secundario' : 'senal'} onClick={onRegresar}>
          Regresar y corregir
        </Boton>
        <Boton variante={completa ? 'senal' : 'secundario'} onClick={onNueva}>
          Nueva auditoría
        </Boton>
      </div>
    </main>
  )
}

function TituloLista({ color, texto, total }: { color: string; texto: string; total: number }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold">
      <span aria-hidden="true" className={`size-2 ${color}`} />
      {texto}
      <span className="font-mono text-xs font-normal text-acero">{total}</span>
    </h2>
  )
}

/**
 * Lista de líneas separada por unidad de medida (bultos, cajas, paquetes,
 * pacas…), con los grupos y los productos en orden alfabético.
 */
function ListaPorUm({
  lineas,
  color,
  texto,
}: {
  lineas: LineaAuditoria[]
  color: string
  texto: (linea: LineaAuditoria) => string
}) {
  return (
    <div className="mt-2 space-y-4">
      {agruparPorUm(lineas).map((grupo) => (
        <section key={grupo.um}>
          <div className="flex items-baseline justify-between border-b-2 border-tinta pb-1">
            <h3 className="text-xs font-bold">{grupo.um}</h3>
            <span className="font-mono text-xs text-acero">{grupo.lineas.length}</span>
          </div>
          <ul className="divide-y divide-linea border-x border-b border-linea bg-hoja">
            {grupo.lineas.map((linea, indice) => (
              <li key={`${linea.referencia}-${indice}`} className="p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-sm font-bold">{linea.referencia}</p>
                  <p className={`font-mono text-sm font-bold ${color}`}>{texto(linea)}</p>
                </div>
                <p className="mt-0.5 text-sm">{linea.descripcion}</p>
                <p className="mt-1 text-xs text-acero">
                  Esperado {linea.cantidadEsperada} / verificado {linea.cantidadVerificada}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
