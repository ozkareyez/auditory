import type { CruceCodigo, LineaDespacho } from '../tipos'
import { normalizarUm } from './auditoria'
import { normalizar } from './normalizar'

/**
 * En esta operación, la referencia de un producto son los últimos 6
 * dígitos de su código de barras. Con esa regla se puede cruzar un código
 * leído contra la columna Referencia aunque el archivo no traiga la
 * columna Código de barras.
 */
export const DIGITOS_REFERENCIA = 6

/**
 * Extrae la referencia implícita en un código de barras: sus últimos 6
 * dígitos. Los caracteres que no sean dígitos (guiones, espacios…) se
 * ignoran antes de cortar.
 */
export function referenciaDesdeCodigo(codigo: string): string {
  const digitos = codigo.replace(/\D/g, '')
  return digitos.slice(-DIGITOS_REFERENCIA)
}

/**
 * Compara la referencia de una línea del archivo con la referencia
 * implícita en un código leído, tolerando mayúsculas, acentos, ceros a la
 * izquierda (045678 y 45678) y prefijos como "REF-456789".
 */
function coincideReferencia(referenciaLinea: string, referenciaCodigo: string): boolean {
  const a = normalizar(referenciaLinea)
  const b = normalizar(referenciaCodigo)
  if (a === '' || b === '') return false
  if (a === b) return true
  const numeroA = Number(a)
  const numeroB = Number(b)
  if (Number.isFinite(numeroA) && Number.isFinite(numeroB) && numeroA === numeroB) return true
  return a.endsWith(b)
}

/**
 * Busca las líneas de un despacho que corresponden a un código de barras
 * leído (RF-05). Prioriza la coincidencia exacta con la columna Código de
 * barras; si no hay, compara la referencia implícita (últimos 6 dígitos)
 * contra la columna Referencia.
 *
 * - coincidencias vacías → el código es un sobrante.
 * - más de una coincidencia → hay que pedirle al usuario que elija.
 */
export function cruzarCodigo(lineas: LineaDespacho[], codigoLeido: string): CruceCodigo {
  const codigo = normalizar(codigoLeido)

  // 1) Coincidencia exacta con la columna de código de barras.
  const exactas = lineas.filter(
    (linea) => linea.codigoBarras !== '' && normalizar(linea.codigoBarras) === codigo,
  )
  if (exactas.length > 0) return { coincidencias: exactas, porReferencia: false }

  // 2) Referencia implícita: los últimos 6 dígitos del código leído.
  const referenciaCodigo = referenciaDesdeCodigo(codigoLeido)
  const porReferencia = lineas.filter((linea) => coincideReferencia(linea.referencia, referenciaCodigo))
  return { coincidencias: porReferencia, porReferencia: porReferencia.length > 0 }
}

/**
 * Decide qué hacer al escanear un código con la cámara durante la auditoría:
 *
 * - una sola línea → sumar 1 a su conteo y resaltarla;
 * - varias → filtrar la lista para que el auditor escoja cuál contar;
 * - ninguna → el código no pertenece al despacho.
 */
export type DestinoEscaneo =
  | { tipo: 'unica'; indice: number }
  | { tipo: 'multiple'; coincidencias: number }
  | { tipo: 'ninguna' }

export function destinoEscaneo(lineas: LineaDespacho[], codigoLeido: string): DestinoEscaneo {
  const { coincidencias } = cruzarCodigo(lineas, codigoLeido)
  if (coincidencias.length === 0) return { tipo: 'ninguna' }
  if (coincidencias.length > 1) return { tipo: 'multiple', coincidencias: coincidencias.length }
  return { tipo: 'unica', indice: lineas.indexOf(coincidencias[0]) }
}

/**
 * Comprueba si una línea corresponde a un texto buscado a mano (RF-06):
 * descripción, referencia o el código de barras, completo o escaneado.
 * Sirve para filtrar la lista mientras se escribe y para el lector de
 * código de barras: de un código escaneado se toman los últimos 6 dígitos
 * como referencia.
 */
export function coincideBusquedaManual(linea: LineaDespacho, consulta: string): boolean {
  const objetivo = normalizar(consulta)
  if (objetivo === '') return true
  if (normalizar(linea.descripcion).includes(objetivo)) return true
  if (normalizar(linea.referencia).includes(objetivo)) return true
  if (linea.codigoBarras !== '' && normalizar(linea.codigoBarras).includes(objetivo)) return true

  // Unidad de medida: "cajas", "CJA" o "bultos" ubican el grupo de una vez,
  // aunque el archivo use la abreviatura o el nombre completo.
  const umLinea = normalizarUm(linea.um)
  const umConsulta = normalizarUm(consulta)
  if (umLinea !== '' && umConsulta !== '') {
    if (umLinea === umConsulta) return true
    // Coincidencia parcial al ir escribiendo ("caj" → "caja"), pero sin que
    // una sola letra haga aparecer todas las líneas de una UM.
    if (umConsulta.length >= 2 && umLinea.includes(umConsulta)) return true
    if (umLinea.length >= 2 && umConsulta.includes(umLinea)) return true
  }

  // Lector de código de barras: la referencia de la línea son los últimos
  // 6 dígitos del código escaneado.
  return coincideReferencia(linea.referencia, referenciaDesdeCodigo(consulta))
}
