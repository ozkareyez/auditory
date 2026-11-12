import type { Despacho, EstadoLinea, LineaAuditoria, ResumenAuditoria, Sobrante } from '../tipos'
import { consolidarLineas } from './despachos'
import { normalizar } from './normalizar'

/**
 * Crea las líneas de auditoría de un despacho, con las cantidades verificadas
 * en 0. La mercancía se consolida por referencia: varias filas del mismo
 * producto se suman en una sola línea.
 */
export function crearAuditoria(despacho: Despacho): LineaAuditoria[] {
  return consolidarLineas(despacho.lineas).map((linea) => ({
    ...linea,
    cantidadVerificada: 0,
    reversion: false,
  }))
}

/** Líneas de un mismo tipo de unidad de medida (bultos, cajas, pacas…). */
export interface GrupoUm<T> {
  um: string
  lineas: T[]
}

function compararTexto(a: string, b: string): number {
  return a.localeCompare(b, 'es', { sensitivity: 'base' })
}

function compararLineas<T extends { descripcion: string; referencia: string }>(a: T, b: T): number {
  const porDescripcion = compararTexto(a.descripcion, b.descripcion)
  if (porDescripcion !== 0) return porDescripcion
  return a.referencia.localeCompare(b.referencia, 'es', { numeric: true, sensitivity: 'base' })
}

/**
 * Lleva las abreviaturas y los plurales de las unidades de medida a una
 * forma común, para que "cajas", "CJA" y "caja" encuentren el mismo grupo.
 */
const SINONIMOS_UM: Record<string, string> = {
  cja: 'caja',
  cajas: 'caja',
  cj: 'caja',
  bto: 'bulto',
  bultos: 'bulto',
  blt: 'bulto',
  und: 'unidad',
  un: 'unidad',
  unidad: 'unidad',
  unidades: 'unidad',
  pac: 'paquete',
  pqt: 'paquete',
  paquete: 'paquete',
  paquetes: 'paquete',
  doc: 'docena',
  docena: 'docena',
  docenas: 'docena',
  kg: 'kilo',
  kilo: 'kilo',
  kilos: 'kilo',
  lt: 'litro',
  l: 'litro',
  litro: 'litro',
  litros: 'litro',
}

export function normalizarUm(um: string): string {
  const base = normalizar(um)
  return SINONIMOS_UM[base] ?? base
}

/**
 * Organiza las líneas por unidad de medida: cada UM (BTO, CJA, PAQ, PAC…)
 * queda en su propio grupo, los grupos van en orden alfabético y dentro de
 * cada uno las líneas también se ordenan alfabéticamente por descripción.
 */
export function agruparPorUm<T extends { um: string; descripcion: string; referencia: string }>(
  lineas: T[],
): GrupoUm<T>[] {
  const grupos = new Map<string, GrupoUm<T>>()
  for (const linea of lineas) {
    const um = linea.um.trim() === '' ? 'Sin UM' : linea.um.trim()
    const clave = normalizar(um)
    const grupo = grupos.get(clave)
    if (grupo === undefined) grupos.set(clave, { um, lineas: [linea] })
    else grupo.lineas.push(linea)
  }
  return [...grupos.values()]
    .sort((a, b) => compararTexto(a.um, b.um))
    .map((grupo) => ({ um: grupo.um, lineas: grupo.lineas.sort(compararLineas) }))
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
