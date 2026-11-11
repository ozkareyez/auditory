import type { Despacho, EstadoLinea, LineaAuditoria, ResumenAuditoria, Sobrante } from '../tipos'

/** Crea las líneas de auditoría de un despacho, con las cantidades verificadas en 0. */
export function crearAuditoria(despacho: Despacho): LineaAuditoria[] {
  return despacho.lineas.map((linea) => ({ ...linea, cantidadVerificada: 0, reversion: false }))
}

/**
 * Estado de una línea: pendiente, completo o con diferencia (RF-04).
 * Una línea sin contar pero marcada como reversión total ya está decidida:
 * cuenta como diferencia, no como pendiente.
 */
export function estadoDeLinea(linea: LineaAuditoria): EstadoLinea {
  if (linea.cantidadVerificada === linea.cantidadEsperada) return 'completo'
  if (linea.cantidadVerificada === 0 && !linea.reversion) return 'pendiente'
  return 'diferencia'
}

/** Unidades que faltan en una línea (negativo = sobran unidades). */
export function diferenciaDeLinea(linea: LineaAuditoria): number {
  return linea.cantidadEsperada - linea.cantidadVerificada
}

/**
 * Calcula el resumen de la auditoría (RF-07): faltantes, reversiones,
 * excedentes por línea, sobrantes leídos y el estado general (completo o
 * con diferencias).
 */
export function calcularResumen(
  lineas: LineaAuditoria[],
  sobrantes: Sobrante[] = [],
): ResumenAuditoria {
  // Los faltantes se separan según el auditor los haya marcado como reversión.
  const conFaltante = lineas.filter((linea) => linea.cantidadVerificada < linea.cantidadEsperada)
  const reversiones = conFaltante.filter((linea) => linea.reversion)
  const faltantes = conFaltante.filter((linea) => !linea.reversion)
  const excedentes = lineas.filter((linea) => linea.cantidadVerificada > linea.cantidadEsperada)
  const completas = lineas.filter((linea) => linea.cantidadVerificada === linea.cantidadEsperada).length
  const revisadas = lineas.filter((linea) => estadoDeLinea(linea) !== 'pendiente').length
  // Una reversión también es una diferencia frente al documento impreso.
  const conDiferencias = conFaltante.length > 0 || excedentes.length > 0 || sobrantes.length > 0
  return {
    estado: conDiferencias ? 'con_diferencias' : 'completo',
    totalLineas: lineas.length,
    revisadas,
    completas,
    faltantes,
    reversiones,
    excedentes,
    sobrantes,
  }
}
