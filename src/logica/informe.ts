// Informe de cierre: tabla con todas las auditorías terminadas de la
// sesión, exportable a Excel. SheetJS se carga también aquí de forma
// diferida, igual que al leer el archivo.
import type { LineaAuditoria } from '../tipos'
import { calcularResumen, diferenciaDeLinea } from './auditoria'

/** Una auditoría terminada, tal como quedó el conteo al finalizar. */
export interface AuditoriaTerminada {
  plc: string
  ruta: string
  placa: string
  fecha: Date
  /** Facturas distintas que componen el despacho; null si el archivo no las trae. */
  facturas: number | null
  /** Líneas ya consolidadas por referencia. */
  lineas: LineaAuditoria[]
}

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, '0')
}

/** Fecha y hora local legible, p. ej. "2026-11-11 09:12". */
function fechaLegible(fecha: Date): string {
  return (
    `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())} ` +
    `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  )
}

/**
 * Arma las dos tablas del informe: una fila por auditoría terminada — con
 * el estado, las unidades y si hubo reversión, con cuántas — y una fila
 * por cada producto de cada PLC, con la fecha y hora de la auditoría, lo
 * despachado de cada referencia y la reversión que se le hizo.
 */
export function tablasInforme(auditorias: AuditoriaTerminada[]): {
  resumen: (string | number)[][]
  detalle: (string | number)[][]
} {
  const resumen: (string | number)[][] = [
    [
      'PLC',
      'Fecha y hora',
      'Ruta',
      'Placa',
      'Facturas',
      'Referencias',
      'Estado',
      'Completas',
      'Con faltante',
      'Con excedente',
      'Unidades esperadas',
      'Unidades verificadas',
      'Unidades faltantes',
      'Tuvo reversión',
      'Unidades en reversión',
    ],
  ]
  const detalle: (string | number)[][] = [
    [
      'PLC',
      'Fecha y hora',
      'Placa',
      'Referencia',
      'Descripción',
      'UM',
      'Peso',
      'Esperado',
      'Despachado',
      'Diferencia',
      'En reversión',
      'Reversión total',
    ],
  ]
  for (const auditoria of auditorias) {
    const resultado = calcularResumen(auditoria.lineas)
    const unidadesEsperadas = auditoria.lineas.reduce((total, linea) => total + linea.cantidadEsperada, 0)
    const unidadesVerificadas = auditoria.lineas.reduce((total, linea) => total + linea.cantidadVerificada, 0)
    const unidadesFaltantes = auditoria.lineas.reduce(
      (total, linea) => total + Math.max(0, diferenciaDeLinea(linea)),
      0,
    )
    const unidadesReversion = resultado.reversiones.reduce(
      (total, linea) => total + diferenciaDeLinea(linea),
      0,
    )
    resumen.push([
      auditoria.plc,
      fechaLegible(auditoria.fecha),
      auditoria.ruta,
      auditoria.placa,
      auditoria.facturas ?? '',
      resultado.totalLineas,
      resultado.estado === 'completo' ? 'Completo' : 'Con diferencias',
      resultado.completas,
      resultado.faltantes.length,
      resultado.excedentes.length,
      unidadesEsperadas,
      unidadesVerificadas,
      unidadesFaltantes,
      resultado.reversiones.length > 0 ? 'Sí' : 'No',
      unidadesReversion,
    ])
    // El detalle lista los productos consolidados de cada despacho, con lo
    // despachado y la reversión que se le hizo a cada referencia.
    for (const linea of auditoria.lineas) {
      const enReversion = linea.reversion ? Math.max(0, diferenciaDeLinea(linea)) : 0
      detalle.push([
        auditoria.plc,
        fechaLegible(auditoria.fecha),
        auditoria.placa,
        linea.referencia,
        linea.descripcion,
        linea.um,
        linea.peso,
        linea.cantidadEsperada,
        linea.cantidadVerificada,
        diferenciaDeLinea(linea),
        enReversion,
        enReversion > 0 && linea.cantidadVerificada === 0 ? 'Sí' : 'No',
      ])
    }
  }
  return { resumen, detalle }
}

/** Genera y descarga el informe .xlsx con las auditorías terminadas. */
export async function descargarInforme(auditorias: AuditoriaTerminada[]): Promise<void> {
  const XLSX = await import('xlsx')
  const { resumen, detalle } = tablasInforme(auditorias)
  const libro = XLSX.utils.book_new()
  const hojaResumen = XLSX.utils.aoa_to_sheet(resumen)
  hojaResumen['!cols'] = [
    { wch: 16 }, { wch: 17 }, { wch: 26 }, { wch: 11 }, { wch: 10 },
    { wch: 12 }, { wch: 16 }, { wch: 11 }, { wch: 13 }, { wch: 15 },
    { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 13 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Auditorías')
  const hojaDetalle = XLSX.utils.aoa_to_sheet(detalle)
  hojaDetalle['!cols'] = [
    { wch: 16 }, { wch: 17 }, { wch: 11 }, { wch: 11 }, { wch: 42 }, { wch: 6 },
    { wch: 8 }, { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 13 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(libro, hojaDetalle, 'Productos')
  const datos = XLSX.write(libro, { bookType: 'xlsx', type: 'array' })
  const archivo = new Blob([datos], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const ahora = new Date()
  const marca = `${ahora.getFullYear()}${dosDigitos(ahora.getMonth() + 1)}${dosDigitos(ahora.getDate())}-${dosDigitos(ahora.getHours())}${dosDigitos(ahora.getMinutes())}`
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `informe-auditorias-${marca}.xlsx`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
